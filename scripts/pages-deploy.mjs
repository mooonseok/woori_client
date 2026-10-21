// Publishes a finished Pages build (scripts/pages-build.mjs) to Cloudflare
// Pages from .github/workflows/deploy.yml and checks it, one command per step.
// deploy.yml runs this file from the workflow's own commit; the commit being
// deployed is only build input (its pages-build.mjs builds it, its
// scripts/api-contract.mjs is read from git and never executed).
// - target: the commit this run deploys. A push deploys the head of
//   RELEASE_BRANCH only (a run that a newer push superseded deploys nothing);
//   workflow_dispatch redeploys a commit already on that branch. Runs from
//   any other ref fail.
// - built <app>: the build job's output (PAGES_OUT_DIR, default
//   apps/<app>/out) is a static build whose release.json names that commit
//   with dirty/pushed/localEnv clean; outputs its content digest.
// - artifact <app>: the deploy job's download has that digest (EXPECTED_DIGEST)
//   and the same release.json.
// - protection: the production environment allows only RELEASE_BRANCH and
//   that branch has a ruleset requiring PRs and blocking force pushes and
//   deletion (GitHub API with GITHUB_TOKEN, actions: read).
// - gate: production API /healthz "contract" >= the deployed commit's
//   MIN_API_CONTRACT and /readyz 200 (server first, then web). A missing or
//   malformed contract fails too. API_CONTRACT_WAIT_MINUTES (0-40, default 0)
//   keeps retrying every API_CONTRACT_POLL_SECONDS (default 30) while a server
//   deploy may still be running, then fails.
// - preflight <app>: the Pages project is a Direct Upload project (no Git
//   source, as Wrangler itself decides) whose production branch is
//   PAGES_PRODUCTION_BRANCH (wrangler --branch with any other name makes only
//   a preview) and which serves the site domain, and the live page carries no
//   script injected by the zone (that would fail every deploy after upload);
//   outputs the live deployment and release for rollback.
// - confirm <app>: the project's production deployment is now this commit.
// - verify <app>: the site serves it: release.json, every /* header of the
//   built _headers exactly (CSP, HSTS, ...), the script-hash CSP meta, no
//   injected script, 404 for a missing path, <page>.html redirecting to
//   <page>, immutable /_next/static files. Retried up to 3 times.
// - rollback <app>: if production moved off PREVIOUS_DEPLOYMENT_ID, rolls back
//   to it (Pages rollback API; only successful production deployments are
//   valid targets) and waits until the site no longer serves this commit.
// Cloudflare calls use CLOUDFLARE_API_TOKEN (Account > Cloudflare Pages >
// Edit) and CLOUDFLARE_ACCOUNT_ID, never printed. Text from servers is quoted
// in logs so it cannot become a workflow command. Values for later steps go
// to $GITHUB_OUTPUT when set.
// Usage: node scripts/pages-deploy.mjs <command> [web|admin]
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { MIN_API_CONTRACT } from './api-contract.mjs';
import { wooriOrigin } from './pages-build.mjs';

const commitSha = /^[0-9a-f]{40}$/;
const deploymentId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';
export const ENVIRONMENT = 'production';

// JSON escapes CR/LF, so quoted server text never starts a log line.
export const quote = (value) => JSON.stringify(String(value ?? ''));

// Per-app defaults. The admin project has no default: it does not exist yet,
// and a fallback must never send the admin build to the member web project.
// page is a route each app exports, used for the header and redirect checks.
export const APPS = {
  web: { project: 'woori-web', site: 'https://woori.stream', page: '/album' },
  admin: { project: '', site: 'https://admin.woori.stream', page: '/login' },
};

export function appConfig(app, env) {
  const defaults = APPS[app];
  if (!defaults) throw new Error('App must be web or admin');
  const key = app.toUpperCase();
  const name = (target) =>
    env[`PAGES_PROJECT_${target.toUpperCase()}`] || APPS[target].project;
  const project = name(app);
  if (!/^[a-z0-9][a-z0-9-]{0,57}$/.test(project))
    throw new Error(`Set PAGES_PROJECT_${key} to the ${app} Pages project`);
  if (project === name(app === 'web' ? 'admin' : 'web'))
    throw new Error('The web and admin apps need separate Pages projects');
  const site = wooriOrigin(
    env[`${key}_SITE_ORIGIN`] || defaults.site,
    `${key}_SITE_ORIGIN`
  );
  return { app, project, site, page: defaults.page };
}

const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function parseContract(value) {
  const match = typeof value === 'string' ? semver.exec(value) : null;
  return match ? match.slice(1).map(Number) : null;
}

export function contractAtLeast(value, min) {
  const need = parseContract(min);
  if (!need) throw new Error(`Invalid minimum API contract ${quote(min)}`);
  const have = parseContract(value);
  if (!have) return false;
  for (let i = 0; i < 3; i++) if (have[i] !== need[i]) return have[i] > need[i];
  return true;
}

const minContractLine = /^export const MIN_API_CONTRACT = '([^'\n]*)';$/m;
export function minContractIn(source) {
  const value = minContractLine.exec(source)?.[1];
  if (!parseContract(value))
    throw new Error('scripts/api-contract.mjs has no MIN_API_CONTRACT X.Y.Z');
  return value;
}

// The deployed commit's minimum, read with show(`<commit>:<path>`). A commit
// from before the gate existed has none: this file's value applies, which is
// at least as high because the minimum only rises along the release branch.
export function targetMinContract(show, commit) {
  let source;
  try {
    source = show(`${commit}:scripts/api-contract.mjs`);
  } catch {
    return { min: MIN_API_CONTRACT, fallback: true };
  }
  return { min: minContractIn(source), fallback: false };
}

const describe = (error) =>
  error?.name === 'TimeoutError'
    ? 'timed out'
    : quote(error?.cause?.code ?? error?.message ?? error);

async function get(url, fetchImpl, headers = {}) {
  const res = await fetchImpl(url, {
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
  return { status: res.status, headers: res.headers, text: await res.text() };
}

// null when production can take this build, otherwise why not.
export async function apiProblem(api, min, fetchImpl = fetch) {
  let health;
  try {
    const res = await get(`${api}/healthz`, fetchImpl);
    if (res.status !== 200) return `/healthz returned ${res.status}`;
    health = JSON.parse(res.text);
  } catch (error) {
    return `/healthz unreachable or not JSON (${describe(error)})`;
  }
  if (!health || typeof health !== 'object' || !('contract' in health))
    return `/healthz has no contract (release ${quote(health?.release ?? 'unknown')}); the API must report contract >= ${min}`;
  if (!parseContract(health.contract))
    return `/healthz contract ${JSON.stringify(health.contract)} is not X.Y.Z`;
  if (!contractAtLeast(health.contract, min))
    return `/healthz contract ${health.contract} is below the required ${min}`;
  try {
    const ready = await get(`${api}/readyz`, fetchImpl);
    if (ready.status !== 200) return `/readyz returned ${ready.status}`;
  } catch (error) {
    return `/readyz unreachable (${describe(error)})`;
  }
  return null;
}

// Runs check until it reports no problem (null or an empty list), attempts
// run out or waitMs has passed; returns the last problem, or null.
export async function retry(
  check,
  {
    waitMs = 0,
    intervalMs = 30000,
    attempts = Infinity,
    log = () => {},
    pause = sleep,
  } = {}
) {
  const deadline = Date.now() + waitMs;
  for (let attempt = 1; ; attempt++) {
    const problem = await check();
    if (!problem || (Array.isArray(problem) && !problem.length)) return null;
    if (attempt >= attempts || Date.now() + intervalMs > deadline)
      return problem;
    log(
      `${[problem].flat().join('; ')}; retrying in ${Math.round(intervalMs / 1000)}s`
    );
    await pause(intervalMs);
  }
}

// head: the release branch head on origin. contains(tip, commit): whether
// commit is tip or one of its ancestors.
export function decideTarget({
  event,
  ref,
  sha,
  input,
  branch,
  head,
  contains,
}) {
  if (!/^[A-Za-z0-9._/-]+$/.test(branch ?? ''))
    throw new Error('RELEASE_BRANCH is not set');
  if (ref !== `refs/heads/${branch}`)
    throw new Error(
      `Deploys run only from refs/heads/${branch}, not ${quote(ref)}; keep RELEASE_BRANCH and on.push.branches equal`
    );
  if (!commitSha.test(head ?? ''))
    throw new Error(`origin has no ${branch} branch`);
  if (event === 'push') {
    if (!commitSha.test(sha ?? '')) throw new Error('No pushed commit');
    return head === sha
      ? { commit: sha, deploy: true }
      : { commit: sha, deploy: false, reason: `superseded by ${head}` };
  }
  if (event === 'workflow_dispatch') {
    const commit = ((input ?? '').trim() || sha || '').toLowerCase();
    if (!commitSha.test(commit))
      throw new Error('commit must be a full 40-character SHA');
    if (!contains(head, commit))
      throw new Error(`${commit} is not on ${branch} (${head})`);
    return { commit, deploy: true };
  }
  throw new Error(`Unsupported event ${quote(event)}`);
}

export function deployedApps(flag) {
  if (![undefined, '', 'false', 'true'].includes(flag))
    throw new Error('DEPLOY_ADMIN_WEB must be true or false');
  return flag === 'true' ? ['web', 'admin'] : ['web'];
}

// null when release.json describes a clean build of commit.
export function releaseProblem(release, app, commit) {
  const expected = {
    app,
    release: commit,
    dirty: false,
    pushed: true,
    localEnv: false,
  };
  return isDeepStrictEqual(release, expected)
    ? null
    : `release.json is ${JSON.stringify(release)}, expected ${JSON.stringify(expected)}`;
}

// The headers the built _headers sets for every path (its /* rule).
export function rootHeaders(text) {
  const lines = text.split('\n');
  const start = lines.indexOf('/*');
  if (start < 0) throw new Error('_headers has no /* rule');
  const headers = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim() || !/^\s/.test(line)) break;
    const match = /^\s+([A-Za-z0-9-]+):\s*(.*?)\s*$/.exec(line);
    if (!match)
      throw new Error(`Unexpected _headers line: ${quote(line.trim())}`);
    headers.push([match[1].toLowerCase(), match[2]]);
  }
  if (!headers.length) throw new Error('_headers /* rule is empty');
  return headers;
}

// Every file of a build output, sorted, as /-separated relative paths.
// Symbolic links are refused: an upload must hold exactly the build files.
export function outputFiles(dir) {
  const found = [];
  const walk = (path) => {
    for (const name of readdirSync(path).sort()) {
      const full = join(path, name);
      const rel = relative(dir, full).split(sep).join('/');
      const stat = lstatSync(full);
      if (stat.isSymbolicLink())
        throw new Error(`${quote(rel)} is a symbolic link`);
      if (stat.isDirectory()) walk(full);
      else found.push(rel);
    }
  };
  walk(dir);
  return found;
}

export function treeDigest(dir) {
  const hash = createHash('sha256');
  for (const rel of outputFiles(dir))
    hash.update(
      `${rel}\0${createHash('sha256')
        .update(readFileSync(join(dir, rel)))
        .digest('hex')}\n`
    );
  return hash.digest('hex');
}

// Problems with a build output for app at commit. With digest, the content
// must also be byte-for-byte what the build job produced.
export function artifactProblems(dir, { app, commit, digest }) {
  let files;
  try {
    files = outputFiles(dir);
  } catch (error) {
    return [`${quote(dir)} is not a readable build output (${error.message})`];
  }
  const problems = [];
  for (const name of ['release.json', '_headers', 'index.html'])
    if (!files.includes(name)) problems.push(`${name} is missing`);
  if (files.some((f) => f === '_worker.js' || f.startsWith('_worker.js/')))
    problems.push('_worker.js would turn the static site into Pages Functions');
  if (files.includes('release.json')) {
    let release;
    try {
      release = JSON.parse(readFileSync(join(dir, 'release.json'), 'utf8'));
    } catch {
      release = 'unreadable';
    }
    const problem = releaseProblem(release, app, commit);
    if (problem) problems.push(problem);
  }
  if (files.includes('_headers'))
    try {
      rootHeaders(readFileSync(join(dir, '_headers'), 'utf8'));
    } catch (error) {
      problems.push(error.message);
    }
  if (digest !== undefined) {
    const actual = treeDigest(dir);
    if (!/^[0-9a-f]{64}$/.test(digest ?? ''))
      problems.push('no build digest to compare with');
    else if (actual !== digest)
      problems.push(`content digest ${actual} is not the build's ${digest}`);
  }
  return problems;
}

async function github(path, { api, token }, fetchImpl) {
  const res = await fetchImpl(`${api}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API ${path} returned ${res.status}`);
  return res.json();
}

// The production environment and the release branch rules, as GitHub reports
// them: GET environments/{name}, its deployment-branch-policies (Actions
// read) and rules/branches/{branch} (Metadata read).
export async function readProtection(
  { api, token, repository, branch },
  fetchImpl = fetch
) {
  const auth = { api, token };
  const base = `/repos/${repository}`;
  const environment = await github(
    `${base}/environments/${ENVIRONMENT}`,
    auth,
    fetchImpl
  );
  const policies = environment?.deployment_branch_policy?.custom_branch_policies
    ? await github(
        `${base}/environments/${ENVIRONMENT}/deployment-branch-policies`,
        auth,
        fetchImpl
      )
    : null;
  const rules =
    (await github(
      `${base}/rules/branches/${encodeURIComponent(branch)}`,
      auth,
      fetchImpl
    )) ?? [];
  return { environment, policies, rules };
}

export function protectionProblems({ environment, policies, rules }, branch) {
  const problems = [];
  if (!environment)
    problems.push(`the ${ENVIRONMENT} environment does not exist`);
  else if (!environment.deployment_branch_policy?.custom_branch_policies)
    problems.push(
      `${ENVIRONMENT} environment deployment branches must be "Selected branches and tags" with only ${branch}`
    );
  else {
    const allowed = (policies?.branch_policies ?? []).map(
      (p) => `${p.type ?? 'branch'} ${p.name}`
    );
    if (!isDeepStrictEqual(allowed, [`branch ${branch}`]))
      problems.push(
        `${ENVIRONMENT} environment deploys from ${quote(allowed.join(', '))}, expected only branch ${branch}`
      );
  }
  const types = new Set((Array.isArray(rules) ? rules : []).map((r) => r.type));
  for (const [type, meaning] of [
    ['pull_request', 'require a pull request'],
    ['non_fast_forward', 'block force pushes'],
    ['deletion', 'restrict deletions'],
  ])
    if (!types.has(type))
      problems.push(`${branch} has no active ruleset rule to ${meaning}`);
  return problems;
}

export async function cloudflare(
  label,
  path,
  { api = CLOUDFLARE_API, token, method = 'GET' },
  fetchImpl = fetch
) {
  let res;
  let body = null;
  try {
    res = await fetchImpl(`${api}${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
    });
    body = await res.json().catch(() => null);
  } catch (error) {
    throw new Error(`Cloudflare ${label} failed (${describe(error)})`);
  }
  if (!res.ok || body?.success !== true) {
    const errors = (Array.isArray(body?.errors) ? body.errors : [])
      .map((e) => `${Number(e?.code) || '?'} ${quote(e?.message)}`)
      .join('; ');
    throw new Error(
      `Cloudflare ${label} failed (HTTP ${res.status}${errors ? `, ${errors}` : ''})`
    );
  }
  return body.result;
}

const projectPath = (cf, project) =>
  `/accounts/${cf.account}/pages/projects/${project}`;

export function projectCheck(project, { branch, site }) {
  const problems = [];
  if (project.production_branch !== branch)
    problems.push(
      `production branch is ${JSON.stringify(project.production_branch)}, not PAGES_PRODUCTION_BRANCH ${JSON.stringify(branch)}; a deploy to another branch is only a preview`
    );
  // Wrangler 4.146.0 treats exactly the projects without `source` as Direct
  // Upload (pages/deploy.ts, pages/projects.ts "Git Provider").
  if (project.source)
    problems.push(
      `project is connected to ${quote(project.source.type ?? 'Git')}; this workflow deploys Direct Upload projects only`
    );
  const host = new URL(site).hostname;
  if (!(Array.isArray(project.domains) ? project.domains : []).includes(host))
    problems.push(`${host} is not a custom domain of the project`);
  const live = project.canonical_deployment;
  const id = live?.id ?? '';
  const commit = live?.deployment_trigger?.metadata?.commit_hash ?? '';
  return {
    problems,
    previous: deploymentId.test(id) ? id : '',
    previousCommit: commitSha.test(commit) ? commit : '',
  };
}

export function confirmProblem(project, { commit, previous }) {
  const live = project.canonical_deployment;
  if (!live) return 'the project has no production deployment';
  if (live.id === previous)
    return `production still serves the previous deployment ${previous} (was this a preview deploy?)`;
  if (live.environment !== 'production')
    return `deployment ${quote(live.id)} is ${quote(live.environment)}, not production`;
  const hash = live.deployment_trigger?.metadata?.commit_hash;
  if (hash !== commit)
    return `production deployment ${quote(live.id)} is commit ${quote(hash || 'unknown')}, expected ${commit}`;
  if (live.latest_stage?.status !== 'success')
    return `production deployment ${quote(live.id)} is at ${quote(live.latest_stage?.name)} ${quote(live.latest_stage?.status)}`;
  return null;
}

export async function servedRelease(site, fetchImpl = fetch) {
  try {
    const res = await get(`${site}/release.json`, fetchImpl);
    if (res.status !== 200)
      return { problem: `/release.json returned ${res.status}` };
    return { release: JSON.parse(res.text) };
  } catch (error) {
    return { problem: `/release.json unreadable (${describe(error)})` };
  }
}

// Sent with page requests: zone features that inject scripts or challenge
// visitors (Web Analytics, Rocket Loader, Bot Fight Mode) act on browsers.
const BROWSER = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 woori-deploy-verify',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'ko-KR,ko;q=0.9',
};

// Zone settings that rewrite HTML: the build's script-hash CSP blocks what
// they add, and Rocket Loader also rewrites the page's own scripts.
const ZONE_FEATURES = [
  [/cloudflareinsights/i, 'Web Analytics automatic setup'],
  [/rocket-loader|rocketscript/i, 'Rocket Loader'],
  [/email-decode|__cf_email__/i, 'Email Address Obfuscation'],
  [/challenge-platform/i, 'Bot Fight Mode'],
];
export function injectedFeatures(html) {
  const named = ZONE_FEATURES.filter(([pattern]) => pattern.test(html)).map(
    ([, name]) => name
  );
  if (!named.length && /\/cdn-cgi\//i.test(html))
    named.push('a zone feature serving /cdn-cgi/ scripts');
  return named;
}
const injectionAdvice = (features) =>
  `script injected by ${features.join(', ')}; turn it off for the woori.stream zone (or install it manually with a CSP change)`;

// Before an upload: whether the live page already carries injected script,
// which no new build can pass. unknown when the page cannot be read.
export async function liveInjection(site, page, fetchImpl = fetch) {
  let res;
  try {
    res = await get(`${site}${page}`, fetchImpl, BROWSER);
  } catch (error) {
    return { unknown: `${page} unreachable (${describe(error)})` };
  }
  if (res.status !== 200) return { unknown: `${page} returned ${res.status}` };
  const features = injectedFeatures(res.text);
  return features.length
    ? { problem: `${site}${page} already has ${injectionAdvice(features)}` }
    : {};
}

// Problems with what site serves for page, given the built _headers rule.
export async function siteProblems(site, { page, headers }, fetchImpl = fetch) {
  const problems = [];
  const fetchOr = async (label, url, extra) => {
    try {
      return await get(url, fetchImpl, extra);
    } catch (error) {
      problems.push(`${label} unreachable (${describe(error)})`);
      return null;
    }
  };
  const html = await fetchOr(page, `${site}${page}`, BROWSER);
  if (html && html.status !== 200)
    problems.push(`${page} returned ${html.status}`);
  else if (html) {
    for (const [name, value] of headers) {
      const served = html.headers.get(name);
      if (served !== value)
        problems.push(
          `${page} ${name} is ${served === null ? 'missing' : JSON.stringify(served)}, expected ${JSON.stringify(value)}`
        );
    }
    if (!html.text.includes('data-woori-csp'))
      problems.push(`${page} has no script-hash CSP meta`);
    const features = injectedFeatures(html.text);
    if (features.length)
      problems.push(`${page} has ${injectionAdvice(features)}`);
    const asset = html.text.match(
      /\/_next\/static\/[^"'\s<>?#]+\.(?:js|css)/
    )?.[0];
    if (!asset) problems.push(`${page} references no /_next/static file`);
    else {
      const res = await fetchOr(asset, `${site}${asset}`);
      const cache = res?.headers.get('cache-control') ?? '';
      if (res && (res.status !== 200 || !/\bimmutable\b/.test(cache)))
        problems.push(
          `${asset} returned ${res.status} with cache-control ${JSON.stringify(cache)}, expected 200 immutable`
        );
    }
  }
  const missing = await fetchOr(
    'missing path',
    `${site}/__woori-deploy-check-missing`,
    BROWSER
  );
  if (missing && missing.status !== 404)
    problems.push(`a missing path returned ${missing.status}, expected 404`);
  const legacy = await fetchOr(`${page}.html`, `${site}${page}.html`, BROWSER);
  if (legacy) {
    const location = legacy.headers.get('location');
    let target = null;
    try {
      target = location ? new URL(location, site) : null;
    } catch {
      target = null;
    }
    if (
      ![301, 302, 307, 308].includes(legacy.status) ||
      target?.origin !== site ||
      target?.pathname !== page
    )
      problems.push(
        `${page}.html returned ${legacy.status}${location ? ` to ${quote(location)}` : ''}, expected a redirect to ${page}`
      );
  }
  return problems;
}

// Waits for the new release.json (a new deployment switches all files at
// once), then checks the rest; a passing error (503, timeout) gets two more
// tries before it counts, however little of waitMs the release wait left.
export async function verifySite(
  { site, app, page, commit, headers },
  {
    fetchImpl = fetch,
    log = () => {},
    pause = sleep,
    waitMs = 180000,
    intervalMs = 10000,
  } = {}
) {
  const stale = await retry(
    async () => {
      const served = await servedRelease(site, fetchImpl);
      return served.problem ?? releaseProblem(served.release, app, commit);
    },
    { waitMs, intervalMs, log, pause }
  );
  if (stale) return [stale];
  return (
    (await retry(() => siteProblems(site, { page, headers }, fetchImpl), {
      waitMs: Infinity,
      intervalMs,
      attempts: 3,
      log,
      pause,
    })) ?? []
  );
}

// Restores previous unless production already serves it, then waits until the
// site stops serving commit (or serves previousRelease when that is known).
export async function rollbackTo(
  { cf, project, previous, previousRelease, commit, site },
  {
    fetchImpl = fetch,
    log = () => {},
    pause = sleep,
    waitMs = 180000,
    intervalMs = 10000,
  } = {}
) {
  if (!deploymentId.test(previous ?? ''))
    throw new Error('No previous production deployment to roll back to');
  const current = await cloudflare(
    'get project',
    projectPath(cf, project),
    cf,
    fetchImpl
  );
  if (current.canonical_deployment?.id === previous) {
    log(`production still serves ${previous}; nothing to roll back`);
    return 'unchanged';
  }
  await cloudflare(
    'rollback',
    `${projectPath(cf, project)}/deployments/${previous}/rollback`,
    { ...cf, method: 'POST' },
    fetchImpl
  );
  log(`rolled ${project} back to ${previous}`);
  const problem = await retry(
    async () => {
      const served = await servedRelease(site, fetchImpl);
      if (served.problem) return served.problem;
      const release = served.release?.release ?? null;
      if (commitSha.test(previousRelease ?? ''))
        return release === previousRelease
          ? null
          : `site serves ${quote(release)}, expected ${previousRelease}`;
      return release === commit ? `site still serves ${commit}` : null;
    },
    { waitMs, intervalMs, log, pause }
  );
  if (problem) throw new Error(`Rollback not visible yet: ${problem}`);
  return 'rolled-back';
}

// GitHub workflow command data escaping (as @actions/core does).
export const commandData = (text) =>
  String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function output(values) {
  for (const [key, value] of Object.entries(values)) {
    if (/[\r\n]/.test(value)) throw new Error(`Output ${key} has a newline`);
    console.log(`${key}=${value}`);
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function credentials(env) {
  if (!env.CLOUDFLARE_API_TOKEN)
    throw new Error('CLOUDFLARE_API_TOKEN is not set');
  if (!/^[0-9a-f]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID ?? ''))
    throw new Error(
      'CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID'
    );
  return {
    token: env.CLOUDFLARE_API_TOKEN,
    account: env.CLOUDFLARE_ACCOUNT_ID,
  };
}

function deployCommit(env) {
  if (!commitSha.test(env.DEPLOY_COMMIT ?? ''))
    throw new Error('DEPLOY_COMMIT must be a 40-character SHA');
  return env.DEPLOY_COMMIT;
}

// The deploy job's timeout (60 minutes) leaves room for the longest wait.
export const MAX_CONTRACT_WAIT_MINUTES = 40;
const bounded = (value, name, fallback, min, max) => {
  const number = Number(value || fallback);
  if (!Number.isFinite(number) || number < min || number > max)
    throw new Error(`${name} must be a number from ${min} to ${max}`);
  return number;
};

const outDir = (app, env) =>
  resolve(env.PAGES_OUT_DIR || join(root, 'apps', app, 'out'));

async function main(command, app, env) {
  const log = (line) => console.log(line);
  if (command === 'target') {
    const branch = env.RELEASE_BRANCH;
    if (!branch) throw new Error('RELEASE_BRANCH is not set');
    const head = git(['ls-remote', 'origin', `refs/heads/${branch}`]).split(
      /\s/
    )[0];
    const contains = (tip, commit) => {
      try {
        git(['cat-file', '-e', `${tip}^{commit}`]);
      } catch {
        git([
          'fetch',
          '--no-tags',
          '--quiet',
          'origin',
          `refs/heads/${branch}`,
        ]);
      }
      try {
        git(['merge-base', '--is-ancestor', commit, tip]);
        return true;
      } catch {
        return false;
      }
    };
    const target = decideTarget({
      event: env.GITHUB_EVENT_NAME,
      ref: env.GITHUB_REF,
      sha: env.GITHUB_SHA,
      input: env.INPUT_COMMIT,
      branch,
      head,
      contains,
    });
    if (!target.deploy)
      console.log(`::notice::Not deploying ${target.commit}: ${target.reason}`);
    output({
      commit: target.commit,
      deploy: String(target.deploy),
      apps: JSON.stringify(deployedApps(env.DEPLOY_ADMIN_WEB)),
    });
    return;
  }
  if (command === 'protection') {
    const branch = env.RELEASE_BRANCH ?? '';
    if (!/^[A-Za-z0-9._/-]+$/.test(branch))
      throw new Error('RELEASE_BRANCH is not set');
    if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? ''))
      throw new Error('GITHUB_REPOSITORY is not set');
    if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set');
    const api = new URL(env.GITHUB_API_URL || 'https://api.github.com');
    if (api.protocol !== 'https:')
      throw new Error('GITHUB_API_URL must be https');
    const problems = protectionProblems(
      await readProtection({
        api: api.href.replace(/\/$/, ''),
        token: env.GITHUB_TOKEN,
        repository: env.GITHUB_REPOSITORY,
        branch,
      }),
      branch
    );
    if (problems.length)
      throw new Error(
        `Deploy protection is not in place:\n${problems.join('\n')}`
      );
    console.log(
      `${ENVIRONMENT} deploys only from ${branch}, which requires pull requests`
    );
    return;
  }
  if (command === 'gate') {
    const api = wooriOrigin(
      env.NEXT_PUBLIC_API_BASE_URL,
      'NEXT_PUBLIC_API_BASE_URL'
    );
    let min = MIN_API_CONTRACT;
    if (env.DEPLOY_COMMIT) {
      const commit = deployCommit(env);
      git(['cat-file', '-e', `${commit}^{commit}`]);
      const target = targetMinContract((spec) => git(['show', spec]), commit);
      min = target.min;
      if (target.fallback)
        console.log(
          `${commit} predates scripts/api-contract.mjs; requiring this workflow's ${min}`
        );
    }
    const waitMs =
      bounded(
        env.API_CONTRACT_WAIT_MINUTES,
        'API_CONTRACT_WAIT_MINUTES',
        0,
        0,
        MAX_CONTRACT_WAIT_MINUTES
      ) * 60000;
    const intervalMs =
      bounded(
        env.API_CONTRACT_POLL_SECONDS,
        'API_CONTRACT_POLL_SECONDS',
        30,
        1,
        300
      ) * 1000;
    const problem = await retry(() => apiProblem(api, min), {
      waitMs,
      intervalMs,
      log,
    });
    if (problem)
      throw new Error(`${api} is not ready for this build: ${problem}`);
    console.log(`${api} serves API contract >= ${min}`);
    return;
  }
  if (command === 'built' || command === 'artifact') {
    if (!APPS[app]) throw new Error('App must be web or admin');
    const dir = outDir(app, env);
    const problems = artifactProblems(dir, {
      app,
      commit: deployCommit(env),
      digest: command === 'artifact' ? (env.EXPECTED_DIGEST ?? '') : undefined,
    });
    if (problems.length)
      throw new Error(`${app} build output:\n${problems.join('\n')}`);
    const digest = treeDigest(dir);
    console.log(
      `${app} build of ${env.DEPLOY_COMMIT}: ${outputFiles(dir).length} files, digest ${digest}`
    );
    if (command === 'built') output({ digest });
    return;
  }
  const config = appConfig(app, env);
  if (command === 'verify') {
    const problems = await verifySite(
      {
        ...config,
        commit: deployCommit(env),
        headers: rootHeaders(
          readFileSync(join(outDir(app, env), '_headers'), 'utf8')
        ),
      },
      { log }
    );
    if (problems.length)
      throw new Error(`${config.site} failed checks:\n${problems.join('\n')}`);
    console.log(`${config.site} serves ${env.DEPLOY_COMMIT} and passes checks`);
    return;
  }
  const cf = credentials(env);
  const project = () =>
    cloudflare('get project', projectPath(cf, config.project), cf);
  if (command === 'preflight') {
    const branch = env.PAGES_PRODUCTION_BRANCH ?? '';
    if (!/^[A-Za-z0-9._/-]+$/.test(branch))
      throw new Error(
        'Set PAGES_PRODUCTION_BRANCH to the project production branch'
      );
    const check = projectCheck(await project(), { branch, site: config.site });
    if (check.problems.length)
      throw new Error(
        `Pages project ${config.project}: ${check.problems.join('; ')}`
      );
    const injection = await liveInjection(config.site, config.page);
    if (injection.problem) throw new Error(injection.problem);
    if (injection.unknown)
      console.log(
        `::warning::${commandData(`Could not check ${config.site} for injected script before the upload: ${injection.unknown}`)}`
      );
    const served = await servedRelease(config.site);
    const live = served.release?.release;
    const previousRelease = commitSha.test(live ?? '') ? live : '';
    console.log(
      `${config.project}: production ${check.previous || 'none'} (commit ${check.previousCommit || 'unknown'}), ${config.site} release ${previousRelease || 'unknown'}`
    );
    output({
      project: config.project,
      branch,
      site: config.site,
      previous_deployment_id: check.previous,
      previous_release: previousRelease,
    });
    return;
  }
  if (command === 'confirm') {
    const commit = deployCommit(env);
    const problem = await retry(
      async () => {
        try {
          return confirmProblem(await project(), {
            commit,
            previous: env.PREVIOUS_DEPLOYMENT_ID ?? '',
          });
        } catch (error) {
          return error.message;
        }
      },
      { waitMs: 120000, intervalMs: 10000, log }
    );
    if (problem) throw new Error(problem);
    console.log(`${config.project} production deployment is ${commit}`);
    return;
  }
  if (command === 'rollback') {
    const result = await rollbackTo(
      {
        cf,
        project: config.project,
        previous: env.PREVIOUS_DEPLOYMENT_ID,
        previousRelease: env.PREVIOUS_RELEASE,
        commit: deployCommit(env),
        site: config.site,
      },
      { log }
    );
    console.log(`rollback ${config.project}: ${result}`);
    return;
  }
  throw new Error(
    'Usage: node scripts/pages-deploy.mjs <target|protection|gate|built|artifact|preflight|confirm|verify|rollback> [web|admin]'
  );
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const [command, app] = process.argv.slice(2);
  try {
    await main(command, app, process.env);
  } catch (error) {
    console.error(
      `::error::${commandData(`pages-deploy ${command}: ${error.message}`)}`
    );
    process.exitCode = 1;
  }
}
