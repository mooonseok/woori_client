import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  finish,
  forbiddenUrls,
  releaseInfo,
  LOCAL_ENV_FILES,
  httpsOrigin,
  onReleaseBranch,
  r2Origin,
  renderHeaders,
  scriptHashes,
  withScriptPolicy,
  wooriOrigin,
} from '../pages-build.mjs';

const page = (scripts) =>
  `<!DOCTYPE html><html lang="ko"><head><meta charSet="utf-8"/><script src="/_next/static/chunks/a.js" async=""></script></head><body><main>우리</main>${scripts.map((s) => `<script>${s}</script>`).join('')}</body></html>`;
const sha = (text) =>
  `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
const account =
  'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com';

test('each page gets a script-src meta with exactly its inline-script hashes, before them', () => {
  const scripts = ['self.__next_f=[]', 'self.__next_f.push([1,"한글"])'];
  const html = withScriptPolicy(page(scripts));
  assert.deepEqual(scriptHashes(page(scripts)), scripts.map(sha));
  const meta = html.match(
    /<meta http-equiv="Content-Security-Policy"[^>]*>/
  )[0];
  assert.equal(
    meta.match(/content="([^"]*)"/)[1],
    `script-src 'self' ${scripts.map(sha).join(' ')}`
  );
  assert.ok(html.indexOf(meta) < html.indexOf('<script>'));
  assert.ok(
    html.startsWith(
      '<!DOCTYPE html><html lang="ko"><head><meta charSet="utf-8"/><meta'
    )
  );
  // External scripts are allowed by 'self', not hashed; reruns are refused.
  assert.equal(scriptHashes(page([])).length, 0);
  assert.throws(() => withScriptPolicy(html), /already present/);
});

test('origins must be public https; the R2 host matches the presigned PUT format', () => {
  assert.equal(
    httpsOrigin('https://api.woori.stream/', 'API'),
    'https://api.woori.stream'
  );
  for (const bad of [
    undefined,
    'http://api.woori.stream',
    'https://localhost:3001',
    'https://127.0.0.1',
    'https://api.example',
  ])
    assert.throws(() => httpsOrigin(bad, 'API'));
  assert.equal(r2Origin(account), account);
  assert.throws(() => r2Origin('https://woori.r2.dev'));
  assert.throws(() => r2Origin(`${account}/bucket`), /account id/);
});

test('_headers placeholders are all filled and Pages limits are enforced', () => {
  const template =
    '/*\n  Content-Security-Policy: connect-src {{API_ORIGIN}}\n';
  assert.equal(
    renderHeaders(template, { API_ORIGIN: 'https://api.woori.stream' }),
    '/*\n  Content-Security-Policy: connect-src https://api.woori.stream\n'
  );
  assert.throws(
    () => renderHeaders(template, {}),
    /No value for \{\{API_ORIGIN\}\}/
  );
  assert.throws(
    () => renderHeaders(`/*\n  X: ${'a'.repeat(2001)}\n`, {}),
    /2000 characters/
  );
});

test('an export with local or mock URLs fails; a clean one is finished in place', () => {
  assert.deepEqual(
    forbiddenUrls(
      'fetch("http://localhost:3001/v1") "http://127.0.0.1:3097" "https://api.example/v1"'
    ),
    ['http://localhost:3001', 'http://127.0.0.1:3097', 'https://api.example']
  );
  // LAN hosts and private addresses are caught as well.
  assert.deepEqual(
    forbiddenUrls(
      '"https://nas.local/api" "http://api.internal:8080" "http://10.1.2.3" "https://192.168.0.10:3001" "http://172.20.0.5" "http://[fd00::1]:3001"'
    ),
    [
      'https://nas.local',
      'http://api.internal:8080',
      'http://10.1.2.3',
      'https://192.168.0.10:3001',
      'http://172.20.0.5',
      'http://[fd00::1]:3001',
    ]
  );
  // Public look-alikes are not: 172.32/16 and 10.x as a longer name.
  assert.deepEqual(
    forbiddenUrls('"https://172.32.0.1" "https://10.1.2.3.example.org"'),
    []
  );
  // Hostnames without a URL (the SW's dev allowlist) and .invalid bases pass.
  assert.deepEqual(
    forbiddenUrls(
      "['localhost','127.0.0.1'] new URL(v,'https://woori.invalid')"
    ),
    []
  );
  const out = mkdtempSync(join(tmpdir(), 'pages-build-'));
  mkdirSync(join(out, 'album'));
  writeFileSync(join(out, 'album.html'), page(['self.__next_f=[]']));
  writeFileSync(join(out, '404.html'), page(['self.__next_f.push(404)']));
  writeFileSync(join(out, 'album', 'x.txt'), 'rsc');
  writeFileSync(
    join(out, '_headers'),
    '/*\n  CSP: connect-src {{API_ORIGIN}}\n'
  );
  const release = releaseInfo('web', {
    commit: 'c'.repeat(40),
    dirty: false,
    pushed: true,
    localEnv: false,
  });
  assert.equal(
    finish(out, { API_ORIGIN: 'https://api.woori.stream' }, release),
    2
  );
  assert.deepEqual(
    JSON.parse(readFileSync(join(out, 'release.json'), 'utf8')),
    {
      app: 'web',
      release: 'c'.repeat(40),
      dirty: false,
      pushed: true,
      localEnv: false,
    }
  );
  assert.match(readFileSync(join(out, '404.html'), 'utf8'), /data-woori-csp/);
  assert.match(
    readFileSync(join(out, '_headers'), 'utf8'),
    /api\.woori\.stream/
  );
  writeFileSync(join(out, 'leak.js'), 'const api="http://localhost:3001"');
  assert.throws(
    () => finish(out, { API_ORIGIN: 'https://api.woori.stream' }),
    /leak\.js: http:\/\/localhost:3001/
  );
});

test('the API origin is woori.stream or a subdomain; R2 keeps only its account format', () => {
  for (const good of [
    'https://api.woori.stream',
    'https://api.woori.stream/',
    'https://woori.stream',
    'https://admin.woori.stream',
    'https://API.Woori.Stream',
  ])
    assert.equal(
      wooriOrigin(good, 'API'),
      new URL(good).origin,
      `${good} is allowed`
    );
  for (const bad of [
    'https://api.invalid',
    'https://api.woori.invalid',
    'https://api.local',
    'https://nas.local',
    'https://api.internal',
    'https://woori.internal',
    'https://10.0.0.5',
    'https://192.168.0.10',
    'https://172.16.0.1',
    'https://172.31.255.254',
    'https://[fd00::1]',
    'https://woori.stream.evil.com',
    'https://evilwoori.stream',
    'https://api.woori.stream.',
    'https://api.woori.dev',
    'https://woori.pages.dev',
    'https://api.woori.stream:8443',
    'https://user:pass@api.woori.stream',
    'http://api.woori.stream',
    'https://localhost',
    undefined,
  ])
    assert.throws(
      () => wooriOrigin(bad, 'API'),
      /must be/,
      `${bad} is refused`
    );
  // The storage host is Cloudflare's, so the allowlist does not apply to it.
  assert.equal(r2Origin(account), account);
  assert.throws(() => r2Origin('https://api.woori.stream'), /account id/);
});

test('release.json names a commit only when the build is reproducible from it', () => {
  const commit = 'a'.repeat(40);
  const clean = { commit, dirty: false, pushed: true, localEnv: false };
  assert.deepEqual(releaseInfo('admin', clean), {
    app: 'admin',
    release: commit,
    dirty: false,
    pushed: true,
    localEnv: false,
  });
  // Uncommitted changes, an unpublished commit or a local env file never
  // claim the HEAD commit; the flags say why.
  for (const reason of [{ dirty: true }, { pushed: false }, { localEnv: true }])
    assert.equal(releaseInfo('web', { ...clean, ...reason }).release, null);
  assert.deepEqual(LOCAL_ENV_FILES, [
    '.env',
    '.env.local',
    '.env.production',
    '.env.production.local',
  ]);
  for (const bad of [undefined, '', 'abc1234', 'A'.repeat(40), `${commit}\n`])
    assert.throws(
      () => releaseInfo('web', { ...clean, commit: bad }),
      /source commit/
    );
});

test('a release-branch head that moved after the checkout is fetched, not taken as unpushed', () => {
  const commit = 'a'.repeat(40);
  const develop = '1'.repeat(40);
  const main = '2'.repeat(40);
  const fakeGit = ({ local, contains, fetchFails = false }) => {
    const calls = [];
    const git = (args) => {
      calls.push(args.join(' '));
      if (args[0] === 'ls-remote')
        return `${develop}\trefs/heads/develop\n${main}\trefs/heads/main`;
      if (args[0] === 'cat-file') {
        if (!local.includes(args[2].slice(0, 40))) throw new Error('missing');
        return '';
      }
      if (args[0] === 'fetch') {
        if (fetchFails) throw new Error('offline');
        local.push(args.at(-1));
        return '';
      }
      if (args[0] === 'merge-base') {
        if (!local.includes(args[3]) || !contains.includes(args[3]))
          throw new Error('not an ancestor');
        return '';
      }
      throw new Error(`unexpected git ${args.join(' ')}`);
    };
    return { git, calls };
  };
  // main moved during the build: its new head is fetched and checked.
  const moved = fakeGit({ local: [develop], contains: [main] });
  assert.equal(onReleaseBranch(moved.git, commit), true);
  assert.ok(moved.calls.includes(`fetch --no-tags --quiet origin ${main}`));
  // Heads already present are not fetched.
  const present = fakeGit({ local: [develop, main], contains: [develop] });
  assert.equal(onReleaseBranch(present.git, commit), true);
  assert.ok(!present.calls.some((c) => c.startsWith('fetch')));
  // Not on either branch, or the head cannot be fetched: not pushed.
  assert.equal(
    onReleaseBranch(
      fakeGit({ local: [develop, main], contains: [] }).git,
      commit
    ),
    false
  );
  assert.equal(
    onReleaseBranch(
      fakeGit({ local: [develop], contains: [main], fetchFails: true }).git,
      commit
    ),
    false
  );
});
