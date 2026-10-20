// Finishes a Next static export for Cloudflare Pages (run after `next build`):
// - adds each HTML page's inline-script hashes as a <meta> CSP (script-src),
//   enforced together with the _headers CSP, so no 'unsafe-inline' remains;
// - fills the _headers origins from the Pages build environment;
// - fails on local/mock URLs, an API outside woori.stream, unresolved
//   placeholders or Pages limits;
// - writes release.json with the source commit, so an operator can tell which
//   build a Pages site serves.
// Usage: node scripts/pages-build.mjs <web|admin>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = 'data-woori-csp';
const inlineScript = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;

export function scriptHashes(html) {
  return [...html.matchAll(inlineScript)].map(
    ([, body]) =>
      `'sha256-${createHash('sha256').update(body).digest('base64')}'`
  );
}

// The meta goes first in <head>, after the charset, before any inline script.
export function withScriptPolicy(html) {
  if (html.includes(MARKER)) throw new Error('CSP meta already present');
  const hashes = [...new Set(scriptHashes(html))];
  const meta = `<meta http-equiv="Content-Security-Policy" ${MARKER}="" content="script-src 'self'${hashes.map((h) => ` ${h}`).join('')}"/>`;
  const charset = /<meta charSet="utf-8"\/>/i;
  if (!charset.test(html)) throw new Error('No <meta charSet> to anchor on');
  return html.replace(charset, (tag) => `${tag}${meta}`);
}

export function httpsOrigin(value, name) {
  let url;
  try {
    url = new URL(value ?? '');
  } catch {
    throw new Error(`${name} must be an https URL`);
  }
  if (url.protocol !== 'https:' || localHost.test(url.hostname))
    throw new Error(`${name} must be a public https origin, got ${url.origin}`);
  return url.origin;
}
// Hosts no production build may name: loopback, private and link-local IPs,
// IPv6 literals, and test, mock or LAN-only names. (.invalid is not here: the
// navigation helpers parse relative paths against https://woori.invalid.)
const LOCAL_HOSTS = String.raw`localhost|0\.0\.0\.0|127(?:\.\d+){3}|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2}|169\.254(?:\.\d+){2}|\[[0-9a-fA-F:.]*\]|[\w.-]+\.(?:localhost|test|example|local|internal)`;
const localHost = new RegExp(`^(?:${LOCAL_HOSTS})$`);

// The production sites and API all live on woori.stream (web, admin., api.).
// Anything else in a Pages build is a mistake: a mock, a LAN or reserved
// name (.invalid, .local, .internal), a private IP or someone else's host.
export const PRODUCTION_DOMAIN = 'woori.stream';
export function wooriOrigin(value, name) {
  const origin = httpsOrigin(value, name);
  const url = new URL(value);
  const { hostname } = url;
  if (
    url.port ||
    url.username ||
    url.password ||
    !(
      hostname === PRODUCTION_DOMAIN ||
      hostname.endsWith(`.${PRODUCTION_DOMAIN}`)
    )
  )
    throw new Error(
      `${name} must be https://${PRODUCTION_DOMAIN} or one of its subdomains, got ${origin}`
    );
  return origin;
}

// The server's path-style R2 host (media-storage.service): presigned PUT
// uploads and signed GET video playback both use it.
export function r2Origin(value) {
  const origin = httpsOrigin(value, 'WOORI_R2_ORIGIN');
  if (
    value.replace(/\/$/, '') !== origin ||
    !/^https:\/\/[0-9a-f]{32}\.r2\.cloudflarestorage\.com$/.test(origin)
  )
    throw new Error(
      'WOORI_R2_ORIGIN must be https://<account id>.r2.cloudflarestorage.com'
    );
  return origin;
}

export function renderHeaders(template, values) {
  const text = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`No value for ${match} in _headers`);
    return values[key];
  });
  const rules = text.split('\n').filter((line) => /^\//.test(line)).length;
  if (rules > 100) throw new Error('_headers allows at most 100 rules');
  const long = text.split('\n').find((line) => line.length > 2000);
  if (long) throw new Error(`_headers line over 2000 characters: ${long}`);
  return text;
}

// URLs that must never ship: local servers, LAN hosts, mock or test domains.
const forbiddenUrl = new RegExp(
  String.raw`https?:\/\/(?:${LOCAL_HOSTS})(?::\d+)?(?![\w.-])`,
  'g'
);
export function forbiddenUrls(text) {
  return [...new Set(text.match(forbiddenUrl) ?? [])];
}

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

// Cloudflare's Git builds provide CF_PAGES_COMMIT_SHA; a local build (direct
// upload) uses HEAD. release names the commit only when the build can be
// reproduced from it: no uncommitted changes, no local env file that `next
// build` reads (apps/<app>/.env*, all gitignored), and the commit is already
// on origin develop/main. Otherwise release is null and the flags say why.
export function releaseInfo(app, { commit, dirty, pushed, localEnv }) {
  if (!/^[0-9a-f]{40}$/.test(commit ?? ''))
    throw new Error('Cannot determine the source commit for release.json');
  const release = !dirty && pushed && !localEnv ? commit : null;
  return { app, release, dirty, pushed, localEnv };
}

// Env files Next loads in a production build; every one is gitignored here.
export const LOCAL_ENV_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
];

// Whether origin's current develop or main head contains the commit.
function onReleaseBranch(git, commit) {
  let heads;
  try {
    heads = git(['ls-remote', '--heads', 'origin', 'develop', 'main']);
  } catch {
    return false;
  }
  return heads
    .split('\n')
    .map((line) => line.split(/\s+/)[0])
    .filter((sha) => /^[0-9a-f]{40}$/.test(sha))
    .some((head) => {
      try {
        git(['merge-base', '--is-ancestor', commit, head]);
        return true;
      } catch {
        return false;
      }
    });
}

export function finish(out, values, release) {
  const all = files(out);
  const problems = [];
  for (const path of all.filter((p) =>
    /\.(html|js|css|txt|json|webmanifest)$/.test(p)
  )) {
    const found = forbiddenUrls(readFileSync(path, 'utf8'));
    if (found.length)
      problems.push(`${relative(out, path)}: ${found.join(', ')}`);
  }
  if (problems.length)
    throw new Error(
      `Local or mock URLs in the export:\n${problems.join('\n')}`
    );
  let pages = 0;
  for (const path of all.filter((p) => p.endsWith('.html'))) {
    writeFileSync(path, withScriptPolicy(readFileSync(path, 'utf8')));
    pages++;
  }
  const headers = join(out, '_headers');
  writeFileSync(headers, renderHeaders(readFileSync(headers, 'utf8'), values));
  if (release)
    writeFileSync(join(out, 'release.json'), `${JSON.stringify(release)}\n`);
  return pages;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const app = process.argv[2];
  if (!['web', 'admin'].includes(app))
    throw new Error('Usage: node scripts/pages-build.mjs <web|admin>');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const values = {
    API_ORIGIN: wooriOrigin(
      process.env.NEXT_PUBLIC_API_BASE_URL,
      'NEXT_PUBLIC_API_BASE_URL'
    ),
    R2_ORIGIN: r2Origin(process.env.WOORI_R2_ORIGIN),
  };
  if (app === 'web' && process.env.NEXT_PUBLIC_APP_MODE === 'demo')
    throw new Error('Production Pages builds run in live mode');
  const git = (args) =>
    execFileSync('git', args, { cwd: root }).toString().trim();
  const fromPages = process.env.CF_PAGES_COMMIT_SHA;
  const commit = fromPages || git(['rev-parse', 'HEAD']);
  const release = releaseInfo(app, {
    commit,
    dirty: !fromPages && git(['status', '--porcelain']) !== '',
    pushed: Boolean(fromPages) || onReleaseBranch(git, commit),
    localEnv: LOCAL_ENV_FILES.some((name) =>
      existsSync(join(root, 'apps', app, name))
    ),
  });
  const pages = finish(join(root, 'apps', app, 'out'), values, release);
  console.log(
    `pages-build ${app}: ${pages} pages, CSP origins ${Object.values(values).join(' ')}, release ${release.release ?? `none (dirty=${release.dirty}, pushed=${release.pushed}, localEnv=${release.localEnv})`}`
  );
}
