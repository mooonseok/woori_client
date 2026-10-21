import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { MIN_API_CONTRACT } from '../api-contract.mjs';
import { renderHeaders } from '../pages-build.mjs';
import {
  apiProblem,
  appConfig,
  artifactProblems,
  cloudflare,
  commandData,
  confirmProblem,
  contractAtLeast,
  decideTarget,
  deployedApps,
  injectedFeatures,
  liveInjection,
  minContractIn,
  parseContract,
  projectCheck,
  protectionProblems,
  quote,
  readProtection,
  releaseProblem,
  retry,
  rollbackTo,
  rootHeaders,
  siteProblems,
  targetMinContract,
  treeDigest,
  verifySite,
} from '../pages-deploy.mjs';

const read = (path) =>
  readFileSync(
    fileURLToPath(new URL(`../../${path}`, import.meta.url)),
    'utf8'
  );
const commit = 'a'.repeat(40);
const newer = 'b'.repeat(40);
const previous = '11111111-2222-4333-8444-555555555555';
const created = '66666666-7777-4888-8999-000000000000';
const instant = { pause: async () => {}, intervalMs: 1 };
const clean = {
  app: 'web',
  release: commit,
  dirty: false,
  pushed: true,
  localEnv: false,
};

// A local HTTP server answering from handler(req) -> {status, headers, body}.
async function serve(t, handler) {
  const requests = [];
  const server = createServer(async (req, res) => {
    requests.push(`${req.method} ${req.url}`);
    const { status = 200, headers = {}, body = '' } = await handler(req);
    res.writeHead(status, headers);
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  return { origin: `http://127.0.0.1:${server.address().port}`, requests };
}

test('contract versions compare numerically and anything else fails closed', () => {
  assert.ok(parseContract(MIN_API_CONTRACT), 'the minimum is X.Y.Z');
  assert.deepEqual(parseContract('0.30.0'), [0, 30, 0]);
  for (const [have, ok] of [
    ['0.29.0', true],
    ['0.30.0', true],
    ['0.29.1', true],
    ['1.0.0', true],
    ['0.28.9', false],
    ['0.3.0', false],
  ])
    assert.equal(contractAtLeast(have, '0.29.0'), ok, have);
  for (const bad of [
    undefined,
    null,
    29,
    '',
    '0.29',
    'v0.29.0',
    '0.29.0-rc.1',
    '00.29.0',
    ' 0.29.0',
  ])
    assert.equal(contractAtLeast(bad, '0.29.0'), false, String(bad));
  assert.throws(() => contractAtLeast('1.0.0', '1.0'), /minimum/);
});

test("the gate uses the deployed commit's minimum, read without running it", () => {
  // This repository's own file stays in the one format the gate reads.
  assert.equal(
    minContractIn(read('scripts/api-contract.mjs')),
    MIN_API_CONTRACT
  );
  const shown = [];
  const show = (files) => (spec) => {
    shown.push(spec);
    if (!(spec in files)) throw new Error('fatal: path does not exist');
    return files[spec];
  };
  assert.deepEqual(
    targetMinContract(
      show({
        [`${commit}:scripts/api-contract.mjs`]:
          "// x\nexport const MIN_API_CONTRACT = '0.31.2';\n",
      }),
      commit
    ),
    { min: '0.31.2', fallback: false }
  );
  assert.deepEqual(shown, [`${commit}:scripts/api-contract.mjs`]);
  // A commit from before the gate (5723576, production today) gets this
  // workflow's minimum, which only rises along the release branch.
  assert.deepEqual(targetMinContract(show({}), newer), {
    min: MIN_API_CONTRACT,
    fallback: true,
  });
  for (const broken of [
    "export const MIN_API_CONTRACT = '0.29';",
    'export const MIN_API_CONTRACT = "0.29.0";',
    "export let MIN_API_CONTRACT = '0.29.0';",
  ])
    assert.throws(
      () =>
        targetMinContract(
          show({ [`${commit}:scripts/api-contract.mjs`]: broken }),
          commit
        ),
      /no MIN_API_CONTRACT/
    );
});

test('the API gate needs /healthz contract >= minimum and /readyz 200', async (t) => {
  const state = { health: {}, ready: 200, healthStatus: 200 };
  const api = await serve(t, (req) =>
    req.url === '/healthz'
      ? { status: state.healthStatus, body: state.health }
      : { status: state.ready, body: { status: 'ready' } }
  );
  // Production on 2026-10-20: no contract field yet.
  state.health = {
    service: 'woori-api',
    status: 'alive',
    implementation: 'auth-groups-media',
    featuresReady: false,
    release: '351360594ffbd63f535636095cb72494a9a08c92',
  };
  assert.match(
    await apiProblem(api.origin, '0.29.0'),
    /no contract \(release "3513605.*"\).*>= 0\.29\.0/
  );
  state.health = { ...state.health, contract: '0.28.0' };
  assert.match(await apiProblem(api.origin, '0.29.0'), /below the required/);
  state.health = { ...state.health, contract: 30 };
  assert.match(await apiProblem(api.origin, '0.29.0'), /not X\.Y\.Z/);
  state.health = { ...state.health, contract: '0.30.0' };
  state.ready = 503;
  assert.equal(await apiProblem(api.origin, '0.29.0'), '/readyz returned 503');
  state.ready = 200;
  assert.equal(await apiProblem(api.origin, '0.29.0'), null);
  state.healthStatus = 502;
  assert.equal(await apiProblem(api.origin, '0.29.0'), '/healthz returned 502');
  state.healthStatus = 200;
  // An HTML error page or a closed port is a problem, not an exception.
  const html = await serve(t, () => ({ body: '<html>Bad gateway</html>' }));
  assert.match(await apiProblem(html.origin, '0.29.0'), /not JSON/);
  assert.match(await apiProblem('http://127.0.0.1:9', '0.29.0'), /unreachable/);
  // A release field carrying a line break cannot start a log line.
  state.health = { release: 'x\n::add-mask::y' };
  assert.doesNotMatch(await apiProblem(api.origin, '0.29.0'), /\n/);
});

test('the gate waits for a server deploy, then gives up', async (t) => {
  let calls = 0;
  const api = await serve(t, (req) => {
    if (req.url === '/readyz') return { body: {} };
    calls++;
    return { body: calls < 3 ? { release: null } : { contract: '0.30.0' } };
  });
  const logged = [];
  const check = () => apiProblem(api.origin, '0.29.0');
  assert.equal(
    await retry(check, {
      waitMs: 60000,
      ...instant,
      log: (l) => logged.push(l),
    }),
    null
  );
  assert.equal(calls, 3);
  assert.equal(logged.length, 2);
  assert.match(logged[0], /no contract.*retrying/);
  // Without waiting (or once the time is up) the last problem is returned.
  calls = 0;
  assert.match(await retry(check, { waitMs: 0, ...instant }), /no contract/);
  assert.equal(calls, 1);
  // attempts bounds the tries even with time left.
  let tries = 0;
  assert.deepEqual(
    await retry(async () => [`try ${++tries}`], {
      waitMs: 60000,
      attempts: 3,
      ...instant,
    }),
    ['try 3']
  );
});

test('a push deploys only the release-branch head; dispatch redeploys a commit on it', () => {
  const base = {
    ref: 'refs/heads/main',
    branch: 'main',
    head: commit,
    contains: (tip, sha) => tip === commit && [commit, newer].includes(sha),
  };
  assert.deepEqual(decideTarget({ ...base, event: 'push', sha: commit }), {
    commit,
    deploy: true,
  });
  assert.deepEqual(
    decideTarget({ ...base, event: 'push', sha: newer, head: commit }),
    { commit: newer, deploy: false, reason: `superseded by ${commit}` }
  );
  assert.deepEqual(
    decideTarget({
      ...base,
      event: 'workflow_dispatch',
      sha: commit,
      input: ` ${newer.toUpperCase()} `,
    }),
    { commit: newer, deploy: true }
  );
  for (const input of [undefined, '', '   '])
    assert.deepEqual(
      decideTarget({ ...base, event: 'workflow_dispatch', sha: commit, input }),
      { commit, deploy: true }
    );
  const refused = [
    [{ event: 'workflow_dispatch', input: 'c'.repeat(40) }, /not on main/],
    [{ event: 'workflow_dispatch', input: 'abc1234' }, /40-character/],
    [{ event: 'push', ref: 'refs/heads/develop', sha: commit }, /only from/],
    [{ event: 'workflow_dispatch', ref: 'refs/heads/develop' }, /only from/],
    [{ event: 'push', sha: commit, head: '' }, /no main branch/],
    [{ event: 'push', sha: commit, branch: '' }, /RELEASE_BRANCH/],
    [{ event: 'pull_request', sha: commit }, /Unsupported/],
  ];
  for (const [change, error] of refused)
    assert.throws(() => decideTarget({ ...base, ...change }), error);
  assert.deepEqual(deployedApps(undefined), ['web']);
  assert.deepEqual(deployedApps('false'), ['web']);
  assert.deepEqual(deployedApps('true'), ['web', 'admin']);
  assert.throws(() => deployedApps('yes'), /true or false/);
});

test('each app resolves its own project and woori.stream site', () => {
  assert.deepEqual(appConfig('web', {}), {
    app: 'web',
    project: 'woori-web',
    site: 'https://woori.stream',
    page: '/album',
  });
  assert.throws(() => appConfig('admin', {}), /PAGES_PROJECT_ADMIN/);
  assert.deepEqual(appConfig('admin', { PAGES_PROJECT_ADMIN: 'woori-admin' }), {
    app: 'admin',
    project: 'woori-admin',
    site: 'https://admin.woori.stream',
    page: '/login',
  });
  // The admin build must never land in the member web project.
  assert.throws(
    () => appConfig('admin', { PAGES_PROJECT_ADMIN: 'woori-web' }),
    /separate/
  );
  assert.throws(
    () => appConfig('web', { WEB_SITE_ORIGIN: 'https://woori.pages.dev' }),
    /must be/
  );
  assert.throws(() => appConfig('api', {}), /web or admin/);
});

test('release.json must name the commit of a clean, pushed build', () => {
  assert.equal(releaseProblem(clean, 'web', commit), null);
  for (const change of [
    { release: null, dirty: true },
    { release: newer },
    { app: 'admin' },
    { localEnv: true },
    { extra: 1 },
  ])
    assert.match(
      releaseProblem({ ...clean, ...change }, 'web', commit),
      /expected/
    );
  assert.match(releaseProblem(null, 'web', commit), /expected/);
});

test('the deployed artifact is byte-for-byte the build, static only, of this commit', (t) => {
  const out = mkdtempSync(join(tmpdir(), 'pages-artifact-'));
  t.after(() => {});
  mkdirSync(join(out, '_next', 'static'), { recursive: true });
  writeFileSync(join(out, 'index.html'), '<html></html>');
  writeFileSync(join(out, '_next', 'static', 'a.js'), 'js');
  writeFileSync(join(out, '_headers'), '/*\n  X-Frame-Options: DENY\n');
  writeFileSync(join(out, 'release.json'), JSON.stringify(clean));
  const digest = treeDigest(out);
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(treeDigest(out), digest, 'the digest is stable');
  assert.deepEqual(artifactProblems(out, { app: 'web', commit }), []);
  assert.deepEqual(artifactProblems(out, { app: 'web', commit, digest }), []);
  assert.match(
    artifactProblems(out, { app: 'web', commit, digest: '' })[0],
    /no build digest/
  );
  assert.match(
    artifactProblems(out, { app: 'web', commit: newer, digest })[0],
    /release\.json is .*expected/
  );
  writeFileSync(join(out, '_next', 'static', 'a.js'), 'changed');
  assert.match(
    artifactProblems(out, { app: 'web', commit, digest })[0],
    /content digest .* is not the build's/
  );
  writeFileSync(join(out, '_worker.js'), 'export default {}');
  assert.ok(
    artifactProblems(out, { app: 'web', commit }).some((p) =>
      /Pages Functions/.test(p)
    )
  );
  symlinkSync('/etc/hosts', join(out, 'hosts'));
  assert.match(
    artifactProblems(out, { app: 'web', commit })[0],
    /symbolic link/
  );
  assert.match(
    artifactProblems(join(out, 'missing'), { app: 'web', commit })[0],
    /not a readable build output/
  );
});

const filled = (app) =>
  renderHeaders(read(`apps/${app}/public/_headers`), {
    API_ORIGIN: 'https://api.woori.stream',
    R2_ORIGIN:
      'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
  });

test('the expected headers are the /* rule of the built _headers', () => {
  const web = Object.fromEntries(rootHeaders(filled('web')));
  assert.match(
    web['content-security-policy'],
    /^default-src 'self';.*connect-src 'self' https:\/\/api\.woori\.stream https:\/\/0123/
  );
  assert.equal(
    web['strict-transport-security'],
    'max-age=31536000; includeSubDomains'
  );
  assert.equal(web['cache-control'], undefined);
  const admin = Object.fromEntries(rootHeaders(filled('admin')));
  assert.equal(admin['x-robots-tag'], 'noindex, nofollow');
  assert.equal(admin['cache-control'], 'no-store');
  assert.throws(() => rootHeaders('/x\n  A: b\n'), /no \/\* rule/);
  assert.throws(() => rootHeaders('/*\n  ! Cache-Control\n'), /Unexpected/);
});

const beacon =
  '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token":"x"}\'></script>';

test('script injected by the zone is named by the setting that adds it', () => {
  assert.deepEqual(injectedFeatures('<html><script src="/_next/a.js">'), []);
  assert.deepEqual(injectedFeatures(beacon), ['Web Analytics automatic setup']);
  assert.deepEqual(
    injectedFeatures(
      '<script src="/cdn-cgi/scripts/7d0fa10a/cloudflare-static/rocket-loader.min.js"></script><a class="__cf_email__">'
    ),
    ['Rocket Loader', 'Email Address Obfuscation']
  );
  assert.deepEqual(
    injectedFeatures(
      '<script src="/cdn-cgi/challenge-platform/h/b/orchestrate">'
    ),
    ['Bot Fight Mode']
  );
  assert.deepEqual(injectedFeatures('<img src="/cdn-cgi/image/x">'), [
    'a zone feature serving /cdn-cgi/ scripts',
  ]);
});

test('the live page is checked for injected script before any upload', async (t) => {
  const state = { status: 200, html: '<html><head></head></html>' };
  const site = await serve(t, () => ({
    status: state.status,
    headers: { 'content-type': 'text/html' },
    body: state.html,
  }));
  assert.deepEqual(await liveInjection(site.origin, '/album'), {});
  // Production on 2026-10-20: Web Analytics adds its beacon.
  state.html = `<html><head></head><body>${beacon}</body></html>`;
  assert.match(
    (await liveInjection(site.origin, '/album')).problem,
    /\/album already has script injected by Web Analytics automatic setup; turn it off for the woori\.stream zone/
  );
  // Unknown (a first admin deploy has no site yet) is reported, not fatal.
  state.status = 503;
  assert.deepEqual(await liveInjection(site.origin, '/album'), {
    unknown: '/album returned 503',
  });
  assert.match(
    (await liveInjection('http://127.0.0.1:9', '/album')).unknown,
    /unreachable/
  );
  const sent = site.requests.length;
  assert.ok(sent >= 3);
});

// A fake Pages site; state.broken changes one response to a failure mode.
async function fakeSite(t, app, release) {
  const headers = rootHeaders(filled(app));
  const state = { release, broken: new Set(), outages: 0 };
  const html =
    '<!DOCTYPE html><html><head><meta charSet="utf-8"/><meta http-equiv="Content-Security-Policy" data-woori-csp="" content="script-src \'self\'"/><script src="/_next/static/chunks/main-0a1b.js" async=""></script></head><body></body></html>';
  const site = await serve(t, (req) => {
    const broken = (name) => state.broken.has(name);
    const page = Object.fromEntries(
      headers.filter(
        ([name]) => !(broken('hsts') && name.includes('transport'))
      )
    );
    if (broken('csp')) page['content-security-policy'] += '; script-src *';
    if (req.url === '/release.json')
      return { body: state.release, headers: { 'cache-control': 'no-store' } };
    if (req.url === '/album' || req.url === '/login') {
      if (state.outages > 0) {
        state.outages--;
        return { status: 503, body: 'temporarily unavailable' };
      }
      return {
        headers: { 'content-type': 'text/html', ...page },
        body: broken('injected')
          ? html.replace('</body>', `${beacon}</body>`)
          : html,
      };
    }
    if (req.url.startsWith('/_next/static/'))
      return {
        headers: {
          'cache-control': broken('static')
            ? 'public, max-age=14400'
            : 'public, max-age=31536000, immutable',
        },
        body: 'js',
      };
    if (req.url.endsWith('.html') && !broken('redirect'))
      return {
        status: 308,
        headers: { location: req.url.slice(0, -'.html'.length) },
      };
    return broken('spa')
      ? { headers: { 'content-type': 'text/html' }, body: html }
      : { status: 404, body: 'Not found' };
  });
  return { ...site, headers, state };
}

test('a site serving the deployed build with every header passes', async (t) => {
  const site = await fakeSite(t, 'web', clean);
  const config = {
    site: site.origin,
    app: 'web',
    page: '/album',
    commit,
    headers: site.headers,
  };
  assert.deepEqual(await verifySite(config, instant), []);
  // An old deployment still answering is waited for, then reported.
  site.state.release = { ...clean, release: newer };
  const [stale] = await verifySite(config, { ...instant, waitMs: 0 });
  assert.match(stale, /release\.json is .*bbbb.*expected/);
  site.state.release = clean;
  for (const [mode, problem] of [
    ['injected', /has script injected by Web Analytics automatic setup/],
    ['hsts', /strict-transport-security is missing/],
    ['csp', /content-security-policy is ".*script-src \*"/],
    ['static', /main-0a1b\.js returned 200 .*expected 200 immutable/],
    ['spa', /missing path returned 200, expected 404/],
    ['redirect', /album\.html returned 404, expected a redirect to \/album/],
  ]) {
    site.state.broken = new Set([mode]);
    const problems = await siteProblems(site.origin, config);
    assert.equal(problems.length, 1, `${mode}: ${problems.join(' | ')}`);
    assert.match(problems[0], problem);
  }
  site.state.broken = new Set();
  // Admin: X-Robots-Tag and no-store are part of its /* rule.
  const admin = await fakeSite(t, 'admin', { ...clean, app: 'admin' });
  assert.deepEqual(
    await siteProblems(admin.origin, {
      page: '/login',
      headers: admin.headers,
    }),
    []
  );
  assert.ok(admin.headers.some(([name]) => name === 'x-robots-tag'));
});

test('one passing outage does not fail the site checks; a lasting problem does after 3 tries', async (t) => {
  const site = await fakeSite(t, 'web', clean);
  const config = {
    site: site.origin,
    app: 'web',
    page: '/album',
    commit,
    headers: site.headers,
  };
  const logged = [];
  site.state.outages = 2;
  assert.deepEqual(
    await verifySite(config, { ...instant, log: (l) => logged.push(l) }),
    []
  );
  assert.equal(logged.length, 2);
  assert.match(logged[0], /\/album returned 503/);
  // Even with no wait left after the release check, 3 tries still happen.
  site.state.broken = new Set(['injected']);
  const before = site.requests.filter((r) => r === 'GET /album').length;
  const problems = await verifySite(config, { ...instant, waitMs: 0 });
  assert.match(problems[0], /Web Analytics/);
  assert.equal(
    site.requests.filter((r) => r === 'GET /album').length - before,
    3
  );
});

test('Pages project checks: production branch, Direct Upload, site domain', () => {
  const project = {
    name: 'woori-web',
    production_branch: 'main',
    domains: ['woori-web.pages.dev', 'woori.stream'],
    canonical_deployment: {
      id: previous,
      environment: 'production',
      deployment_trigger: { type: 'ad_hoc', metadata: { commit_hash: '' } },
    },
  };
  const ok = { branch: 'main', site: 'https://woori.stream' };
  assert.deepEqual(projectCheck(project, ok), {
    problems: [],
    previous,
    previousCommit: '',
  });
  assert.match(
    projectCheck(project, { ...ok, branch: 'production' }).problems[0],
    /production branch is "main".*only a preview/
  );
  // As Wrangler decides: any source means a Git-connected project.
  for (const source of [{ type: 'github' }, { type: 'gitlab', config: {} }])
    assert.match(
      projectCheck({ ...project, source }, ok).problems[0],
      /connected to ".*"; this workflow deploys Direct Upload projects only/
    );
  assert.deepEqual(projectCheck({ ...project, source: null }, ok).problems, []);
  assert.match(
    projectCheck(project, { ...ok, site: 'https://admin.woori.stream' })
      .problems[0],
    /admin\.woori\.stream is not a custom domain/
  );
  assert.equal(
    projectCheck({ ...project, canonical_deployment: null }, ok).previous,
    ''
  );
  // Values that would go to $GITHUB_OUTPUT must have the expected shape.
  assert.deepEqual(
    projectCheck(
      {
        ...project,
        canonical_deployment: {
          id: 'x\ny',
          deployment_trigger: { metadata: { commit_hash: 'z\n' } },
        },
      },
      ok
    ),
    { problems: [], previous: '', previousCommit: '' }
  );
});

test('the deploy refuses an unprotected production environment or release branch', async (t) => {
  const environment = {
    name: 'production',
    deployment_branch_policy: {
      protected_branches: false,
      custom_branch_policies: true,
    },
  };
  const policies = {
    total_count: 1,
    branch_policies: [{ name: 'main', type: 'branch' }],
  };
  const rules = [
    { type: 'deletion' },
    { type: 'non_fast_forward' },
    { type: 'pull_request', parameters: {} },
  ];
  assert.deepEqual(
    protectionProblems({ environment, policies, rules }, 'main'),
    []
  );
  assert.match(
    protectionProblems({ environment: null, policies, rules }, 'main')[0],
    /production environment does not exist/
  );
  // Created on first use: no branch policy at all.
  assert.match(
    protectionProblems(
      {
        environment: { name: 'production', deployment_branch_policy: null },
        policies: null,
        rules,
      },
      'main'
    )[0],
    /must be "Selected branches and tags" with only main/
  );
  assert.match(
    protectionProblems(
      {
        environment,
        policies: {
          branch_policies: [
            { name: 'main' },
            { name: 'develop', type: 'branch' },
          ],
        },
        rules,
      },
      'main'
    )[0],
    /deploys from "branch main, branch develop", expected only branch main/
  );
  assert.deepEqual(
    protectionProblems({ environment, policies, rules: [] }, 'main'),
    [
      'main has no active ruleset rule to require a pull request',
      'main has no active ruleset rule to block force pushes',
      'main has no active ruleset rule to restrict deletions',
    ]
  );
  // Read through the GitHub API with the job token.
  const github = await serve(t, (req) => {
    if (req.headers.authorization !== 'Bearer job-token')
      return { status: 401, body: {} };
    if (req.url === '/repos/o/r/environments/production')
      return { body: environment };
    if (
      req.url ===
      '/repos/o/r/environments/production/deployment-branch-policies'
    )
      return { body: policies };
    if (req.url === '/repos/o/r/rules/branches/main') return { body: rules };
    return { status: 404, body: {} };
  });
  const read = (token) =>
    readProtection({
      api: github.origin,
      token,
      repository: 'o/r',
      branch: 'main',
    });
  assert.deepEqual(protectionProblems(await read('job-token'), 'main'), []);
  await assert.rejects(read('other'), /returned 401/);
  const missing = await serve(t, () => ({ status: 404, body: {} }));
  assert.deepEqual(
    await readProtection({
      api: missing.origin,
      token: 't',
      repository: 'o/r',
      branch: 'main',
    }),
    { environment: null, policies: null, rules: [] }
  );
});

test('the new deployment must be the production deployment of this commit', () => {
  const live = {
    id: created,
    environment: 'production',
    deployment_trigger: { metadata: { commit_hash: commit } },
    latest_stage: { name: 'deploy', status: 'success' },
  };
  const confirm = (change) =>
    confirmProblem(
      { canonical_deployment: change && { ...live, ...change } },
      { commit, previous }
    );
  assert.equal(confirm({}), null);
  assert.match(confirm({ id: previous }), /previous deployment/);
  assert.match(
    confirm({ environment: 'preview' }),
    /"preview", not production/
  );
  assert.match(
    confirm({ deployment_trigger: { metadata: { commit_hash: newer } } }),
    /expected a{40}/
  );
  assert.match(
    confirm({ latest_stage: { name: 'deploy', status: 'failure' } }),
    /"deploy" "failure"/
  );
  assert.match(confirm(null), /no production deployment/);
});

test('Cloudflare errors name the call and codes, never the token', async (t) => {
  const token = 'cf-test-token-value';
  const api = await serve(t, (req) =>
    req.headers.authorization === `Bearer ${token}`
      ? { body: { success: true, result: { name: 'woori-web' } } }
      : {
          status: 403,
          body: {
            success: false,
            errors: [
              { code: 10000, message: 'Authentication error\n::warning::x' },
            ],
          },
        }
  );
  assert.deepEqual(
    await cloudflare('get project', '/p', { api: api.origin, token }),
    { name: 'woori-web' }
  );
  await assert.rejects(
    cloudflare('get project', '/p', { api: api.origin, token: 'wrong' }),
    (error) =>
      /get project failed \(HTTP 403, 10000 "Authentication error\\n::warning::x"\)/.test(
        error.message
      ) &&
      !error.message.includes('wrong') &&
      !error.message.includes('\n')
  );
});

test('server text is quoted and workflow command data is escaped', () => {
  assert.equal(
    quote('a\r\n::set-output name=x::y'),
    '"a\\r\\n::set-output name=x::y"'
  );
  assert.equal(quote(null), '""');
  assert.equal(commandData('50%\nnext\rline'), '50%25%0Anext%0Dline');
});

test('rollback restores the previous deployment only when production moved', async (t) => {
  const state = { canonical: created, rolledBack: false };
  const site = { release: commit };
  const pages = await serve(t, (req) => {
    if (req.url === '/release.json')
      return { body: { app: 'web', release: site.release } };
    if (req.method === 'POST') {
      state.rolledBack = true;
      state.canonical = previous;
      site.release = newer;
      return { body: { success: true, result: { id: previous } } };
    }
    return {
      body: {
        success: true,
        result: { canonical_deployment: { id: state.canonical } },
      },
    };
  });
  const job = {
    cf: { api: pages.origin, token: 't', account: 'f'.repeat(32) },
    project: 'woori-web',
    previous,
    previousRelease: newer,
    commit,
    site: pages.origin,
  };
  assert.equal(await rollbackTo(job, instant), 'rolled-back');
  assert.ok(
    pages.requests.includes(
      `POST /accounts/${'f'.repeat(32)}/pages/projects/woori-web/deployments/${previous}/rollback`
    )
  );
  // Production never left the previous deployment (the upload failed).
  const posts = pages.requests.filter((r) => r.startsWith('POST')).length;
  assert.equal(await rollbackTo(job, instant), 'unchanged');
  assert.equal(
    pages.requests.filter((r) => r.startsWith('POST')).length,
    posts
  );
  // Without a recorded release, the site just must stop serving the commit.
  const stuck = await serve(t, (req) =>
    req.url === '/release.json'
      ? { body: { release: commit } }
      : req.method === 'POST'
        ? { body: { success: true, result: {} } }
        : {
            body: {
              success: true,
              result: { canonical_deployment: { id: created } },
            },
          }
  );
  await assert.rejects(
    rollbackTo(
      {
        ...job,
        cf: { ...job.cf, api: stuck.origin },
        site: stuck.origin,
        previousRelease: '',
      },
      { ...instant, waitMs: 0 }
    ),
    /still serves a{40}/
  );
  await assert.rejects(
    rollbackTo({ ...job, previous: '' }, instant),
    /No previous/
  );
});

// A reader for the YAML subset the workflows use: block mappings and
// sequences, plain, quoted and flow scalars, | and >- blocks, comments.
function parseYaml(source) {
  const lines = source.split('\n');
  let i = 0;
  const indent = (line) => line.length - line.trimStart().length;
  const next = () => {
    while (i < lines.length && /^\s*(#.*)?$/.test(lines[i])) i++;
    return lines[i];
  };
  const keyLine = /^\s*([\w$.-]+):(?: (.*))?$/;
  const scalar = (text) => {
    const value = text.trim();
    if (value.startsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
    if (value.startsWith('"')) return JSON.parse(value);
    if (value.startsWith('['))
      return value
        .slice(1, -1)
        .split(',')
        .map((item) => scalar(item))
        .filter((item) => item !== '');
    return value.replace(/\s+#.*$/, '');
  };
  const value = (rest, own) => {
    if (/^[|>][-+]?$/.test(rest)) {
      const body = [];
      while (i < lines.length && (!lines[i].trim() || indent(lines[i]) > own))
        body.push(lines[i++]);
      while (body.length && !body.at(-1).trim()) body.pop();
      const pad = Math.min(...body.filter((l) => l.trim()).map(indent));
      const text = body.map((l) => l.slice(pad));
      return rest[0] === '|'
        ? text.join('\n')
        : text.map((l) => l.trim()).join(' ');
    }
    if (rest) return scalar(rest);
    const line = next();
    if (line === undefined || indent(line) <= own) return null;
    if (/^\s*-( |$)/.test(line) || keyLine.test(line))
      return block(indent(line));
    const parts = [];
    while (i < lines.length && lines[i].trim() && indent(lines[i]) > own)
      parts.push(lines[i++].trim());
    return scalar(parts.join(' '));
  };
  const block = (at) => {
    if (/^\s*-( |$)/.test(lines[i])) {
      const list = [];
      while (
        next() !== undefined &&
        indent(lines[i]) === at &&
        /^\s*-( |$)/.test(lines[i])
      ) {
        const rest = lines[i].slice(at + 1).trimStart();
        if (keyLine.test(rest)) {
          lines[i] = ' '.repeat(at + 2) + rest;
          list.push(block(at + 2));
        } else {
          i++;
          list.push(scalar(rest));
        }
      }
      return list;
    }
    const map = {};
    while (
      next() !== undefined &&
      indent(lines[i]) === at &&
      !/^\s*-( |$)/.test(lines[i])
    ) {
      const match = keyLine.exec(lines[i]);
      if (!match) throw new Error(`Unreadable YAML line ${i + 1}: ${lines[i]}`);
      i++;
      map[match[1]] = value((match[2] ?? '').trim(), at);
    }
    return map;
  };
  next();
  return block(indent(lines[i]));
}

const ORDER = [
  'artifact',
  'protection',
  'project',
  'early',
  'gate',
  'current',
  'before',
  'deploy',
  'confirm',
  'verify',
  'rollback',
];
const SECRET_STEPS = [
  'protection',
  'project',
  'before',
  'deploy',
  'confirm',
  'rollback',
];
const ROLLBACK_IF =
  '(failure() || cancelled()) && vars.PAGES_AUTO_ROLLBACK != \'false\' && steps.before.outputs.previous_deployment_id != \'\' && contains(fromJSON(\'["success","failure","cancelled"]\'), steps.deploy.outcome)';
const secretUse = /secrets\.|github\.token/;

// What deploy.yml must keep: wiring that, if broken, deploys the wrong thing,
// skips a check or a rollback, or hands secrets to dependency code.
function deployWorkflowProblems(text) {
  let wf;
  try {
    wf = parseYaml(text);
  } catch (error) {
    return [error.message];
  }
  const problems = [];
  const check = (ok, message) => ok || problems.push(message);
  const jobs = wf.jobs ?? {};
  const { target = {}, quality = {}, build = {}, deploy = {} } = jobs;
  check(
    !('push' in (wf.on ?? {})) &&
      'workflow_dispatch' in (wf.on ?? {}) &&
      wf.env?.RELEASE_BRANCH === 'develop',
    'manual-only workflow_dispatch on develop required'
  );
  check(!('workflow_run' in (wf.on ?? {})), 'no workflow_run trigger');
  check(
    quality.uses === './.github/workflows/quality.yml' &&
      quality.with?.ref === '${{ needs.target.outputs.commit }}',
    'Quality runs quality.yml on the deployed commit'
  );
  check(
    !build.environment &&
      isDeepStrictEqual(build.permissions, { contents: 'read' }),
    'build has no environment and only contents: read'
  );
  for (const [name, job] of [
    ['build', build],
    ['quality', quality],
  ])
    check(
      !secretUse.test(JSON.stringify(job)),
      `${name} must not see secrets or the GitHub token`
    );
  const targetSecrets =
    JSON.stringify(target).match(/\$\{\{[^}]*secrets\.[^}]*\}\}/g) ?? [];
  check(
    targetSecrets.every((e) =>
      /^\$\{\{ secrets\.\w+ != ''(?: \|\| secrets\.\w+ != '')* \}\}$/.test(e)
    ),
    'target may only test whether repository secrets are visible'
  );
  const uploads = (build.steps ?? []).filter((s) =>
    /upload-artifact@/.test(s.uses ?? '')
  );
  check(
    isDeepStrictEqual(
      uploads.map((s) => s.with?.name),
      ['pages-web', 'pages-admin']
    ) &&
      uploads.every((s) =>
        s.if?.startsWith("steps.current.outputs.deploy == 'true'")
      ),
    'build uploads pages-web and pages-admin only after its recheck'
  );
  check(
    deploy.environment?.name === 'production',
    'deploy runs in the production environment'
  );
  check(
    ['target', 'quality', 'build'].every((job) =>
      (deploy.needs ?? []).includes(job)
    ),
    'deploy needs target, quality and build'
  );
  check(
    deploy.concurrency?.['cancel-in-progress'] === 'false',
    'a running deploy is never cancelled'
  );
  const steps = deploy.steps ?? [];
  const at = ORDER.map((id) => steps.findIndex((s) => s.id === id));
  check(
    at.every((p, k) => p >= 0 && (k === 0 || p > at[k - 1])),
    `deploy steps must run as ${ORDER.join(' -> ')}`
  );
  const step = (id) => steps.find((s) => s.id === id) ?? {};
  const recheckSaysDeploy = "steps.current.outputs.deploy == 'true'";
  check(
    step('before').if === recheckSaysDeploy &&
      step('deploy').if === recheckSaysDeploy,
    'record and upload run only when the recheck says deploy'
  );
  check(
    ['confirm', 'verify'].every(
      (id) => step(id).if === "steps.deploy.outcome == 'success'"
    ),
    'confirm and verify follow a successful upload'
  );
  check(
    (step('rollback').if ?? '').replace(/\s+/g, ' ') === ROLLBACK_IF,
    'rollback runs on failure or cancel once the upload started, unless disabled'
  );
  const upload = step('deploy');
  check(
    /--branch="\$PAGES_BRANCH"/.test(upload.run ?? '') &&
      upload.env?.PAGES_BRANCH === '${{ steps.before.outputs.branch }}' &&
      (text.match(/--branch\b/g) ?? []).length === 1,
    '--branch is only the production branch the preflight confirmed'
  );
  check(
    /--project-name="\$PAGES_PROJECT"/.test(upload.run ?? '') &&
      upload.env?.PAGES_PROJECT === '${{ steps.before.outputs.project }}',
    '--project-name is the project the preflight checked'
  );
  check(
    /scripts\/wrangler\/node_modules\/\.bin\/wrangler/.test(upload.run ?? '') &&
      !/\bnpx\b/.test(text) &&
      step('wrangler').run === 'npm ci --ignore-scripts --no-audit --no-fund' &&
      step('wrangler')['working-directory'] === 'scripts/wrangler',
    'wrangler comes from the scripts/wrangler lockfile, without install scripts'
  );
  const secretSteps = steps
    .filter((s) => secretUse.test(JSON.stringify(s)))
    .map((s) => s.id);
  check(
    isDeepStrictEqual(secretSteps, SECRET_STEPS),
    `only ${SECRET_STEPS.join(', ')} get secrets, not ${secretSteps.join(', ')}`
  );
  check(
    [...steps, ...(build.steps ?? []), ...(target.steps ?? [])].every(
      (s) => !/\$\{\{[^}]*(secrets|github\.token)/.test(s.run ?? '')
    ),
    'no secret is written into a run script'
  );
  check(
    steps.filter((s) => s.uses).every((s) => /@[0-9a-f]{40}$/.test(s.uses)),
    'deploy job actions are pinned to commit SHAs'
  );
  check(
    steps.find((s) => /download-artifact@/.test(s.uses ?? ''))?.with?.name ===
      'pages-${{ matrix.app }}' &&
      step('artifact').env?.EXPECTED_DIGEST ===
        '${{ needs.build.outputs[matrix.app] }}',
    'deploy checks the downloaded build against the build digest'
  );
  return problems;
}

test('deploy.yml keeps the deploy wiring: release branch, order, secrets, rollback', () => {
  const deploy = read('.github/workflows/deploy.yml');
  assert.deepEqual(deployWorkflowProblems(deploy), []);
  const quality = read('.github/workflows/quality.yml');
  assert.match(quality, /workflow_call:/);
  assert.match(quality, /ref: \$\{\{ inputs\.ref \}\}/);
  // Each of these edits keeps the YAML valid but must now fail the check.
  const steps = deploy.split(/(?=^ {6}- )/m);
  const named = (name) =>
    steps.findIndex((s) => s.startsWith(`      - name: ${name}\n`));
  const record = named('Record the live deployment');
  const moved = [...steps];
  const [recordStep] = moved.splice(record, 1);
  moved.splice(named('Deploy to Cloudflare Pages'), 0, recordStep);
  const mutations = {
    'rollback step removed': [
      deploy.slice(
        0,
        deploy.indexOf('      - name: Roll back to the previous deployment')
      ),
      /rollback|deploy steps must run/,
    ],
    'upload to a preview branch': [
      deploy.replace('--branch="$PAGES_BRANCH"', '--branch=preview'),
      /--branch is only the production branch/,
    ],
    'record moved after the upload': [
      moved.join(''),
      /deploy steps must run as/,
    ],
    'rollback only on failure': [
      deploy.replace(
        /^ {8}if: >-\n {10}\(failure\(\) \|\| cancelled\(\)\)[\s\S]*?steps\.deploy\.outcome\)\n/m,
        "        if: failure() && steps.before.outputs.previous_deployment_id != ''\n"
      ),
      /rollback runs on failure or cancel/,
    ],
    'a secret in the build job': [
      deploy.replace(
        '      WOORI_R2_ORIGIN: ${{ vars.WOORI_R2_ORIGIN }}\n',
        '      WOORI_R2_ORIGIN: ${{ vars.WOORI_R2_ORIGIN }}\n      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}\n'
      ),
      /build must not see secrets/,
    ],
    'trigger branch drift': [
      deploy.replace('on:\n', 'on:\n  push:\n    branches: [develop]\n'),
      /manual-only/,
    ],
  };
  for (const [name, [mutated, expected]] of Object.entries(mutations)) {
    assert.notEqual(mutated, deploy, `${name}: the mutation applies`);
    const problems = deployWorkflowProblems(mutated);
    assert.ok(
      problems.some((p) => expected.test(p)),
      `${name}: ${problems.join(' | ') || 'not caught'}`
    );
  }
});
