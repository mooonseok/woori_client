import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { ApiError } from '../src/services/api-client.ts';
import {
  deleteMember,
  getMember,
  listMembers,
  renameMember,
  suspendMember,
  unsuspendMember,
} from '../src/services/members.ts';
import {
  getGroup,
  listAlbumPhotos,
  listGroups,
} from '../src/services/groups.ts';
import { getMetrics } from '../src/services/metrics.ts';
import { ownedGroupsOf } from '../src/utils/member-actions.ts';

const BASE = 'http://localhost:3001';
const ID = '0b7c6f2e-1d2a-4c3b-9e8f-7a6b5c4d3e2f';
const ALBUM = '1c8d7a3f-2e3b-4d4c-8f9a-8b7c6d5e4f3a';
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
function capture(t: TestContext, respond: () => Response) {
  const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = BASE;
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
  });
  const calls: Request[] = [];
  const mock = t.mock.method(
    globalThis,
    'fetch',
    async (input: RequestInfo, init?: RequestInit) => {
      calls.push(new Request(input, init));
      return respond();
    }
  );
  const last = async () => {
    const request = calls.at(-1)!;
    const text = await request.clone().text();
    return {
      method: request.method,
      path: request.url.slice(BASE.length),
      body: text ? JSON.parse(text) : undefined,
      guard: request.headers.get('X-Woori-Request'),
    };
  };
  return { last, mock };
}
const page = () => json(200, { items: [], nextCursor: null });

test('member list sends the trimmed search (max 64) and status only when chosen', async (t) => {
  const http = capture(t, page);
  await listMembers({ query: '  ', status: null, cursor: null });
  assert.equal((await http.last()).path, '/v1/admin/users?limit=20');
  await listMembers({ query: ' 김 우리 ', status: 'SUSPENDED', cursor: 'c' });
  assert.equal(
    (await http.last()).path,
    `/v1/admin/users?query=${encodeURIComponent('김 우리').replace(/%20/g, '+')}&status=SUSPENDED&cursor=c&limit=20`
  );
  await listMembers({ query: 'a'.repeat(80), status: null, cursor: null });
  const sent = new URL(BASE + (await http.last()).path).searchParams.get(
    'query'
  );
  assert.equal(sent?.length, 64);
});

test('member actions use the documented methods, paths and bodies', async (t) => {
  const http = capture(t, () => json(200, { id: ID }));
  await getMember(ID);
  assert.deepEqual(await http.last(), {
    method: 'GET',
    path: `/v1/admin/users/${ID}`,
    body: undefined,
    guard: null,
  });
  await renameMember(ID, '새 이름', '본인 요청으로 변경');
  assert.deepEqual(await http.last(), {
    method: 'PATCH',
    path: `/v1/admin/users/${ID}`,
    body: { displayName: '새 이름', reason: '본인 요청으로 변경' },
    guard: '1',
  });
  await suspendMember(ID, '반복 괴롭힘');
  assert.deepEqual((await http.last()).body, { reason: '반복 괴롭힘' });
  assert.equal((await http.last()).path, `/v1/admin/users/${ID}/suspend`);
  await unsuspendMember(ID, '소명 확인');
  assert.equal((await http.last()).path, `/v1/admin/users/${ID}/unsuspend`);
  await deleteMember(ID, '운영 정책 위반', 'woori_kim');
  assert.deepEqual(await http.last(), {
    method: 'POST',
    path: `/v1/admin/users/${ID}/delete`,
    body: { reason: '운영 정책 위반', confirmUsername: 'woori_kim' },
    guard: '1',
  });
  await assert.rejects(suspendMember('../groups', 'x'), { status: 400 });
});

test('owned groups that block deletion are read from the 409 body', async (t) => {
  capture(t, () =>
    json(409, {
      code: 'ADMIN_OWNED_GROUPS_REMAIN',
      groups: [
        { id: ID, name: '우리 가족' },
        { id: 1, name: 'broken' },
      ],
    })
  );
  const error = await deleteMember(ID, '정책 위반', 'woori_kim').then(
    () => assert.fail('expected 409'),
    (cause: unknown) => cause
  );
  assert.ok(error instanceof ApiError);
  assert.equal(error.code, 'ADMIN_OWNED_GROUPS_REMAIN');
  assert.deepEqual(ownedGroupsOf(error), [{ id: ID, name: '우리 가족' }]);
  assert.equal(ownedGroupsOf(new ApiError(409, 'x', 'OTHER')), null);
  assert.deepEqual(
    ownedGroupsOf(new ApiError(409, 'x', 'ADMIN_OWNED_GROUPS_REMAIN')),
    []
  );
});

test('groups are read-only: list, detail and album photo metadata', async (t) => {
  const http = capture(t, page);
  await listGroups({ query: '가족', status: 'DELETING', cursor: null });
  assert.equal(
    (await http.last()).path,
    `/v1/admin/groups?query=${encodeURIComponent('가족')}&status=DELETING&limit=20`
  );
  await getGroup(ID).catch(() => undefined);
  assert.equal((await http.last()).path, `/v1/admin/groups/${ID}`);
  await listAlbumPhotos(ID, ALBUM, 'cur');
  assert.equal(
    (await http.last()).path,
    `/v1/admin/groups/${ID}/albums/${ALBUM}/photos?limit=30&cursor=cur`
  );
  const before = http.mock.mock.callCount();
  await assert.rejects(listAlbumPhotos(ID, '../../users', null), {
    status: 400,
  });
  assert.equal(http.mock.mock.callCount(), before);
});

test('metrics must have the documented shape', async (t) => {
  let body: unknown = { users: { active: 1 }, mail: null };
  capture(t, () => json(200, body));
  assert.equal((await getMetrics()).mail, null);
  body = { ok: true };
  await assert.rejects(getMetrics(), /형식/);
});
