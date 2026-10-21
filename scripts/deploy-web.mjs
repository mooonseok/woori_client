// IDE terminal entry point. Build a disposable clone of origin/develop; load
// Cloudflare credentials only AFTER dependency installation and quality checks.
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  base,
  log,
  assert,
  run,
  buildEnv,
  privateEnv,
  config,
  acquire,
  target,
  current,
  noActions,
  checkout,
  fields,
  publishVerified,
} from './local-deploy-common.mjs';
import { wooriOrigin, r2Origin } from './pages-build.mjs';
import { appConfig } from './pages-deploy.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repository = 'mooonseok/woori_client';
function setup() {
  mkdirSync(base, { recursive: true, mode: 0o700 });
  const file = join(base, 'web.json');
  if (!existsSync(file))
    writeFileSync(
      file,
      JSON.stringify(
        {
          apiOrigin: 'https://api.woori.stream',
          r2Origin:
            'https://0eb338cb87053995ac28c51e9494c228.r2.cloudflarestorage.com',
          project: 'woori-web',
          site: 'https://woori.stream',
          productionBranch: 'main',
          credentialsFile: '~/.woori/deploy/cloudflare.env',
        },
        null,
        2
      ) + '\n',
      { mode: 0o600 }
    );
  const secret = join(base, 'cloudflare.env');
  if (!existsSync(secret))
    writeFileSync(secret, 'CLOUDFLARE_ACCOUNT_ID=\nCLOUDFLARE_API_TOKEN=\n', {
      mode: 0o600,
    });
  log(
    `설정: ${file}\n비밀값 파일: ${secret}\n기존 파일은 보존했습니다. Pages Edit 토큰을 비밀값 파일에 한 번 입력하세요.`
  );
}
async function main() {
  const args = process.argv.slice(2);
  if (args[0] === 'setup') return setup();
  if (args.includes('--help')) {
    log(
      'pnpm deploy:setup → cloudflare.env 입력 → pnpm deploy:web. --check는 설정/API/Pages 상태만 조회합니다. 최신 origin/develop을 배포하며 로컬 미커밋 코드는 포함하지 않습니다.'
    );
    return;
  }
  assert(
    args.every((a) => a === '--check'),
    '사용법: pnpm deploy:web [--check|--help]'
  );
  const cfg = config('web');
  const publicEnv = buildEnv({
    NEXT_PUBLIC_API_BASE_URL: wooriOrigin(cfg.apiOrigin, 'apiOrigin'),
    WOORI_R2_ORIGIN: r2Origin(cfg.r2Origin),
    NEXT_PUBLIC_APP_MODE: 'live',
    PAGES_PROJECT_WEB: cfg.project,
    WEB_SITE_ORIGIN: cfg.site,
    PAGES_PRODUCTION_BRANCH: cfg.productionBranch,
  });
  const app = appConfig('web', publicEnv);
  assert(
    /^[A-Za-z0-9._/-]+$/.test(cfg.productionBranch),
    'Pages 운영 브랜치를 확인하세요.'
  );
  const { head, remote } = await target(root, repository);
  await noActions(repository);
  const unlock = acquire('web');
  let source;
  const tool = join(root, 'scripts/pages-deploy.mjs');
  const commands = (command, env, capture = false) =>
    run(process.execPath, [tool, command, 'web'], { cwd: root, env, capture });
  const env = { ...publicEnv, DEPLOY_COMMIT: head };
  try {
    log(`대상: ${app.site}, origin/develop ${head}`);
    await commands('gate', env);
    if (args.includes('--check')) {
      const secrets = privateEnv(cfg.credentialsFile);
      await commands('preflight', {
        ...env,
        CLOUDFLARE_ACCOUNT_ID: secrets.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: secrets.CLOUDFLARE_API_TOKEN,
      });
      log('설정·운영 API·Pages 확인 완료. 빌드·업로드 없음.');
      return;
    }
    source = await checkout(root, remote, head);
    log('격리된 체크아웃에서 품질 검사와 회원 웹 빌드를 실행합니다.');
    await run('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], {
      cwd: source.dir,
      env: publicEnv,
    });
    await run('pnpm', ['policy:quality'], { cwd: source.dir, env: publicEnv });
    await run('pnpm', ['pages:web'], { cwd: source.dir, env: publicEnv });
    env.PAGES_OUT_DIR = join(source.dir, 'apps/web/out');
    const built = fields((await commands('built', env, true)).out);
    env.EXPECTED_DIGEST = built.digest;
    const wranglerDir = join(source.dir, 'scripts/wrangler');
    await run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: wranglerDir,
    });
    // No Cloudflare credentials have reached pnpm, tests, builds or npm ci.
    const secrets = privateEnv(cfg.credentialsFile);
    const publishEnv = {
      ...env,
      CLOUDFLARE_ACCOUNT_ID: secrets.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_API_TOKEN: secrets.CLOUDFLARE_API_TOKEN,
      WRANGLER_SEND_METRICS: 'false',
    };
    await current(root, head);
    await noActions(repository);
    await commands('gate', env);
    const before = fields((await commands('preflight', publishEnv, true)).out);
    assert(
      before.previous_deployment_id,
      '복구할 기존 Pages 배포가 없습니다. 최초 프로젝트 생성은 별도 설정이 필요합니다.'
    );
    publishEnv.PREVIOUS_DEPLOYMENT_ID = before.previous_deployment_id;
    publishEnv.PREVIOUS_RELEASE = before.previous_release;
    await commands('artifact', env);
    const empty = mkdtempSync(join(tmpdir(), 'woori-wrangler-'));
    try {
      await current(root, head);
      await noActions(repository);
      log('Cloudflare Pages 운영 배포');
      await publishVerified({
        upload: () =>
          run(
            join(wranglerDir, 'node_modules/.bin/wrangler'),
            [
              'pages',
              'deploy',
              env.PAGES_OUT_DIR,
              `--project-name=${app.project}`,
              `--branch=${cfg.productionBranch}`,
              `--commit-hash=${head}`,
              '--commit-dirty=false',
            ],
            { cwd: empty, env: publishEnv }
          ),
        confirm: () => commands('confirm', publishEnv),
        verify: () => commands('verify', env),
        rollback: () => {
          log('업로드 또는 검증 실패. 이전 Pages 배포로 복구합니다.');
          return commands('rollback', publishEnv);
        },
      });
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
    log(`회원 웹 배포 완료: ${head}\n${app.site}`);
  } finally {
    source?.cleanup();
    unlock();
  }
}
main().catch((error) => {
  console.error(`[배포] ${error.message}`);
  process.exitCode = 1;
});
