import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as api from '../src/services/web-push.ts';
import { safeReturnTo } from '../src/utils/auth-navigation.ts';
const deliveryId = '11111111-1111-4111-8111-111111111111';
const installationId = '22222222-2222-4222-8222-222222222222';
const recipientId = '33333333-3333-4333-8333-333333333333';
const notificationId = '44444444-4444-4444-8444-444444444444';
const payload = { deliveryId, installationId, recipientId, notificationId };
const workerSource = await readFile(
  new URL('../public/sw.js', import.meta.url),
  'utf8'
);
function worker(
  response: Response | Error = Response.json({
    ...payload,
    body: '새 소식',
    url: 'https://evil.example',
  })
) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const notifications: { title: string; options: Record<string, unknown> }[] =
    [];
  const navigations: string[] = [];
  const requests: { url: string; init: RequestInit }[] = [];
  const self = {
    location: {
      href: 'https://woori.example/sw.js?apiOrigin=https%3A%2F%2Fapi.woori.example',
      origin: 'https://woori.example',
    },
    addEventListener: (name: string, fn: (event: unknown) => void) => {
      listeners[name] = fn;
    },
    skipWaiting: async () => {},
    registration: {
      getNotifications: async () => [],
      showNotification: async (
        title: string,
        options: Record<string, unknown>
      ) => {
        notifications.push({ title, options });
      },
    },
    clients: {
      claim: async () => {},
      matchAll: async () => [],
      openWindow: async (url: string) => {
        navigations.push(url);
      },
    },
  };
  vm.runInNewContext(workerSource, {
    self,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async (url: URL, init: RequestInit) => {
      requests.push({ url: String(url), init });
      if (response instanceof Error) throw response;
      return response;
    },
  });
  return {
    notifications,
    navigations,
    requests,
    listeners,
    self,
    dispatch: async (name: string, event: Record<string, unknown>) => {
      let work = Promise.resolve();
      listeners[name]({
        ...event,
        waitUntil: (promise: Promise<void>) => {
          work = promise;
        },
      });
      await work;
    },
  };
}
test('service worker verifies active session display authorization and ignores injected URLs and titles', async () => {
  const w = worker();
  await w.dispatch('push', { data: { json: () => payload } });
  assert.equal(
    w.requests[0].url,
    `https://api.woori.example/v1/push/deliveries/${deliveryId}/display`
  );
  assert.equal(w.requests[0].init.credentials, 'include');
  assert.equal(w.requests[0].init.cache, 'no-store');
  assert.equal(w.notifications.length, 1);
  assert.equal(w.notifications[0].title, '우리');
  assert.equal(w.notifications[0].options.body, '새 소식');
  assert.equal(
    w.listeners.fetch,
    undefined,
    'private API/media requests must not be cached'
  );
});
test('queued pushes fail closed after logout, account rebind, revoked membership, or unavailable API', async () => {
  for (const response of [
    new Response(null, { status: 401 }),
    new Response(null, { status: 404 }),
    new Error('offline'),
    Response.json({
      ...payload,
      recipientId: deliveryId,
      body: 'other account',
    }),
    Response.json({
      ...payload,
      installationId: deliveryId,
      body: 'old session',
    }),
    Response.json({
      ...payload,
      notificationId: deliveryId,
      body: 'other target',
    }),
  ]) {
    const w = worker(response);
    await w.dispatch('push', { data: { json: () => payload } });
    assert.equal(w.notifications.length, 0);
  }
});
test('malformed push data and insecure non-local API origins never fetch or display', async () => {
  for (const data of [
    null,
    {},
    { ...payload, notificationId: '../../other' },
    { ...payload, installationId: 2 },
  ]) {
    const w = worker();
    await w.dispatch('push', { data: { json: () => data } });
    assert.equal(w.requests.length, 0);
    assert.equal(w.notifications.length, 0);
  }
  const w = worker();
  w.self.location.href =
    'https://woori.example/sw.js?apiOrigin=http%3A%2F%2Fapi.example';
  await w.dispatch('push', { data: { json: () => payload } });
  assert.equal(w.requests.length, 0);
});
test('notification clicks reconstruct an app-only target and reject arbitrary routes', async () => {
  const w = worker();
  let closed = false;
  await w.dispatch('notificationclick', {
    notification: {
      data: { notificationId, url: 'https://evil.example' },
      close: () => {
        closed = true;
      },
    },
  });
  assert.equal(closed, true);
  assert.deepEqual(w.navigations, [
    `https://woori.example/notifications?notificationId=${notificationId}`,
  ]);
  await w.dispatch('notificationclick', {
    notification: {
      data: { notificationId: '//evil.example' },
      close: () => {},
    },
  });
  assert.equal(w.navigations.length, 1);
});
test('authenticated notification destination survives login with only a UUID target', () => {
  assert.equal(
    safeReturnTo(
      `/notifications?notificationId=${notificationId}&url=https://evil.example`
    ),
    `/notifications?notificationId=${notificationId}`
  );
  assert.equal(
    safeReturnTo('/notifications?notificationId=../outside'),
    '/notifications'
  );
});
function fetchSetup(t: TestContext) {
  const old = globalThis.fetch,
    base = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example';
  t.after(() => {
    globalThis.fetch = old;
    if (base === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = base;
  });
}
test('subscription API uses cookie session, cancellation, CSRF header and no user-supplied account identity', async (t) => {
  fetchSetup(t);
  const requests: { path: string; body: unknown }[] = [];
  const signal = new AbortController().signal;
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.signal, signal);
    assert.equal(init?.cache, 'no-store');
    if (init?.method)
      assert.equal(new Headers(init.headers).get('X-Woori-Request'), '1');
    requests.push({
      path: new URL(String(input)).pathname,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return init?.method === 'DELETE'
      ? new Response(null, { status: 204 })
      : Response.json({});
  };
  await api.pushConfig(signal);
  await api.pushStatus('https://push.example/endpoint', signal);
  await api.savePushSubscription(
    {
      endpoint: 'https://push.example/endpoint',
      keys: { p256dh: 'key', auth: 'auth' },
      expirationTime: null,
    },
    signal
  );
  await api.removePushSubscription('id/slash', signal);
  assert.deepEqual(requests[1].body, {
    endpoint: 'https://push.example/endpoint',
  });
  assert.equal(requests[3].path, '/v1/push/subscriptions/id%2Fslash');
});
test('logout cleanup closes notifications and unsubscribes browser endpoint without unregistering worker', async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let closed = 0,
    unsubscribed = 0;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      serviceWorker: {
        getRegistration: async () => ({
          getNotifications: async () => [
            {
              close: () => {
                closed++;
              },
            },
          ],
          pushManager: {
            getSubscription: async () => ({
              unsubscribe: async () => {
                unsubscribed++;
                return true;
              },
            }),
          },
        }),
      },
    },
  });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else Reflect.deleteProperty(globalThis, 'navigator');
  });
  await api.clearBrowserPush();
  assert.equal(closed, 1);
  assert.equal(unsubscribed, 1);
});
test('VAPID base64url key conversion preserves bytes', () => {
  const bytes = new Uint8Array([4, 255, 254, 0, 127]);
  assert.deepEqual(
    api.vapidKey(Buffer.from(bytes).toString('base64url')),
    bytes
  );
});
test('browser subscription timeout cleans a late native subscription and permits a shared pending retry', async () => {
  let complete!: (subscription: PushSubscription) => void;
  let unsubscribed = 0,
    requests = 0;
  const promise = new Promise<PushSubscription>((resolve) => {
    complete = resolve;
  });
  const registration = {
    pushManager: {
      subscribe: () => {
        requests++;
        return promise;
      },
    },
  } as unknown as ServiceWorkerRegistration;
  await assert.rejects(
    api.subscribeBrowserPush(
      registration,
      new Uint8Array([1]),
      new AbortController().signal,
      1
    ),
    /응답하지/
  );
  complete({
    unsubscribe: async () => {
      unsubscribed++;
      return true;
    },
  } as PushSubscription);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(unsubscribed, 1);
  assert.equal(requests, 1);

  let retryComplete!: (subscription: PushSubscription) => void;
  const retryPromise = new Promise<PushSubscription>((resolve) => {
    retryComplete = resolve;
  });
  const retryRegistration = {
    pushManager: {
      subscribe: () => {
        requests++;
        return retryPromise;
      },
    },
  } as unknown as ServiceWorkerRegistration;
  const controller = new AbortController();
  const first = api.subscribeBrowserPush(
    retryRegistration,
    new Uint8Array([1]),
    controller.signal
  );
  controller.abort();
  await assert.rejects(first);
  const second = api.subscribeBrowserPush(
    retryRegistration,
    new Uint8Array([1]),
    new AbortController().signal
  );
  retryComplete({
    unsubscribe: async () => {
      unsubscribed++;
      return true;
    },
  } as PushSubscription);
  await second;
  assert.equal(requests, 2, 'retry shares one pending native request');
  assert.equal(unsubscribed, 1, 'active retry retains the subscription');
});
test('logout invalidation suppresses a display response already in flight', async () => {
  let resolveResponse!: () => void;
  // Delay the authorized body, then invalidate before the worker can display it.
  let release!: (value: unknown) => void;
  const response = Response.json({ ...payload, body: 'private preview' });
  response.json = () =>
    new Promise((resolve) => {
      release = resolve;
      resolveResponse();
    });
  const custom = worker(response);
  const reached = new Promise<void>((resolve) => {
    resolveResponse = resolve;
  });
  const push = custom.dispatch('push', { data: { json: () => payload } });
  await reached;
  await custom.dispatch('message', { data: { type: 'WOORI_PUSH_CLEAR' } });
  release({ ...payload, body: 'private preview' });
  await push;
  assert.equal(custom.notifications.length, 0);
});
test('permission timeout does not stack prompts or continue registration after a late grant', async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'Notification'
  );
  let grant!: (value: NotificationPermission) => void;
  let prompts = 0,
    continued = 0;
  const native = new Promise<NotificationPermission>((resolve) => {
    grant = resolve;
  });
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: {
      permission: 'default',
      requestPermission: () => {
        prompts++;
        return native;
      },
    },
  });
  t.after(() => {
    if (descriptor)
      Object.defineProperty(globalThis, 'Notification', descriptor);
    else Reflect.deleteProperty(globalThis, 'Notification');
  });
  const first = api
    .requestPushPermission(new AbortController().signal, 1)
    .then(() => {
      continued++;
    });
  await assert.rejects(first, /허용 창/);
  const retry = api.requestPushPermission(new AbortController().signal);
  assert.equal(prompts, 1);
  grant('granted');
  assert.equal(await retry, 'granted');
  assert.equal(
    continued,
    0,
    'timed out operation never auto-subscribes after late grant'
  );
});

test('VAPID key rotation replaces obsolete or unverifiable subscriptions before server registration', async () => {
  const key = new Uint8Array([4, 1, 2]);
  for (const oldKey of [
    new Uint8Array([4, 9, 2]).buffer,
    new Uint8Array([4, 1]).buffer,
    null,
  ]) {
    const calls: string[] = [];
    const fresh = {
      options: { applicationServerKey: key.buffer },
    } as PushSubscription;
    const previous = {
      options: { applicationServerKey: oldKey },
      unsubscribe: async () => {
        calls.push('unsubscribe');
        return true;
      },
    };
    const registration = {
      pushManager: {
        getSubscription: async () => previous,
        subscribe: async (options: PushSubscriptionOptionsInit) => {
          calls.push('subscribe');
          assert.deepEqual(options.applicationServerKey, key);
          return fresh;
        },
      },
    } as unknown as ServiceWorkerRegistration;
    assert.equal(
      await api.ensureBrowserPushSubscription(
        registration,
        key,
        new AbortController().signal
      ),
      fresh
    );
    assert.deepEqual(calls, ['unsubscribe', 'subscribe']);
  }
});
test('matching VAPID key reuses subscription; failed key rotation never creates a second subscription', async () => {
  const key = new Uint8Array([4, 1, 2]);
  let unsubscribed = 0,
    subscribed = 0;
  const previous = {
    options: { applicationServerKey: key.buffer },
    unsubscribe: async () => {
      unsubscribed++;
      return false;
    },
  };
  const registration = {
    pushManager: {
      getSubscription: async () => previous,
      subscribe: async () => {
        subscribed++;
        return previous;
      },
    },
  } as unknown as ServiceWorkerRegistration;
  assert.equal(
    await api.ensureBrowserPushSubscription(
      registration,
      key,
      new AbortController().signal
    ),
    previous
  );
  assert.equal(unsubscribed, 0);
  assert.equal(subscribed, 0);
  await assert.rejects(
    api.ensureBrowserPushSubscription(
      registration,
      new Uint8Array([4, 3, 2]),
      new AbortController().signal
    ),
    /이전 알림 연결/
  );
  assert.equal(unsubscribed, 1);
  assert.equal(subscribed, 0);
});

test('retry waits for late orphan unsubscription before reading or registering a replacement endpoint', async () => {
  const key = new Uint8Array([4, 1, 2]);
  let resolveNative!: (subscription: PushSubscription) => void;
  let finishUnsubscribe!: (result: boolean) => void;
  let cleanupStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    cleanupStarted = resolve;
  });
  const native = new Promise<PushSubscription>((resolve) => {
    resolveNative = resolve;
  });
  let current: PushSubscription | null = null,
    subscriptions = 0,
    reads = 0;
  const orphan = {
    options: { applicationServerKey: key.buffer },
    unsubscribe: () => {
      cleanupStarted();
      return new Promise<boolean>((resolve) => {
        finishUnsubscribe = (result) => {
          current = null;
          resolve(result);
        };
      });
    },
  } as PushSubscription;
  const replacement = {
    options: { applicationServerKey: key.buffer },
  } as PushSubscription;
  const registration = {
    pushManager: {
      getSubscription: async () => {
        reads++;
        return current;
      },
      subscribe: () => {
        subscriptions++;
        if (subscriptions === 1) return native;
        current = replacement;
        return Promise.resolve(replacement);
      },
    },
  } as unknown as ServiceWorkerRegistration;
  await assert.rejects(
    api.subscribeBrowserPush(
      registration,
      key,
      new AbortController().signal,
      1
    ),
    /응답하지/
  );
  current = orphan;
  resolveNative(orphan);
  await started;
  let completed = false;
  const retry = api
    .ensureBrowserPushSubscription(
      registration,
      key,
      new AbortController().signal
    )
    .then((subscription) => {
      completed = true;
      return subscription;
    });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(completed, false);
  assert.equal(reads, 0, 'cleanup blocks reading the doomed endpoint');
  assert.equal(subscriptions, 1);
  finishUnsubscribe(true);
  assert.equal(await retry, replacement);
  assert.equal(current, replacement);
  assert.equal(subscriptions, 2);
  assert.equal(reads, 1);
});
