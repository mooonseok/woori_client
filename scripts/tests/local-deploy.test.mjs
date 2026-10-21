import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishVerified, buildEnv, run } from '../local-deploy-common.mjs';

test('local web release verifies publication and does not roll back on success', async () => {
  const calls = [];
  await publishVerified(
    Object.fromEntries(
      ['upload', 'confirm', 'verify', 'rollback'].map((key) => [
        key,
        async () => calls.push(key),
      ])
    )
  );
  assert.deepEqual(calls, ['upload', 'confirm', 'verify']);
});
for (const failure of ['upload', 'confirm', 'verify'])
  test(`local web rolls back after ${failure} failure`, async () => {
    const calls = [];
    const tasks = Object.fromEntries(
      ['upload', 'confirm', 'verify', 'rollback'].map((key) => [
        key,
        async () => {
          calls.push(key);
          if (key === failure) throw new Error('fixture');
        },
      ])
    );
    await assert.rejects(publishVerified(tasks), /fixture/);
    assert.equal(calls.at(-1), 'rollback');
  });
test('rollback failure cannot be reported as deployment success', async () => {
  await assert.rejects(
    publishVerified({
      upload: async () => {
        throw new Error('upload');
      },
      rollback: async () => {
        throw new Error('rollback');
      },
    }),
    /자동 복구 실패/
  );
});
test('dependency build cannot inherit Cloudflare or DB credentials', async () => {
  process.env.CLOUDFLARE_API_TOKEN = 'private-fixture';
  process.env.DATABASE_URL = 'private-fixture';
  try {
    const { out } = await run(
      process.execPath,
      [
        '-e',
        'console.log(JSON.stringify([process.env.CLOUDFLARE_API_TOKEN,process.env.DATABASE_URL]))',
      ],
      { env: buildEnv(), capture: true }
    );
    assert.equal(out, '[null,null]');
  } finally {
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.DATABASE_URL;
  }
});
