import { apiRequest } from './api-client.ts';
import type { PushConfig, PushRegistration } from '../dto/web-push.dto.ts';
export const pushConfig = (signal?: AbortSignal) =>
  apiRequest<PushConfig>('/v1/push/config', { signal });
export const pushStatus = (endpoint: string, signal?: AbortSignal) =>
  apiRequest<PushRegistration>('/v1/push/subscriptions/status', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
    signal,
  });
export const savePushSubscription = (
  subscription: PushSubscriptionJSON,
  signal?: AbortSignal
) =>
  apiRequest<PushRegistration>('/v1/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscription),
    signal,
  });
export const removePushSubscription = (id: string, signal?: AbortSignal) =>
  apiRequest<void>(`/v1/push/subscriptions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    signal,
  });
export function supportsWebPush() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}
export function vapidKey(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
export async function pushWorker() {
  const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || '').origin;
  const registration = await navigator.serviceWorker.register(
    `/sw.js?apiOrigin=${encodeURIComponent(apiOrigin)}`,
    { scope: '/', updateViaCache: 'none' }
  );
  if (!registration.active)
    await new Promise<void>((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) return reject(new Error('알림 연결을 시작하지 못했어요.'));
      const timeout = setTimeout(
        () =>
          reject(new Error('알림 연결 시간이 초과됐어요. 다시 시도해 주세요.')),
        15000
      );
      const changed = () => {
        if (worker.state === 'activated' || worker.state === 'redundant') {
          clearTimeout(timeout);
          worker.removeEventListener('statechange', changed);
          if (worker.state === 'activated') resolve();
          else reject(new Error('알림 연결을 시작하지 못했어요.'));
        }
      };
      worker.addEventListener('statechange', changed);
      changed();
    });
  return registration;
}
export async function clearBrowserPush() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator))
    return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return;
  registration.active?.postMessage({ type: 'WOORI_PUSH_CLEAR' });
  (await registration.getNotifications()).forEach((notification) =>
    notification.close()
  );
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();
}

const pendingSubscriptions = new WeakMap<
  PushManager,
  {
    promise: Promise<PushSubscription>;
    waiters: number;
    cleanup?: Promise<void>;
  }
>();
export async function subscribeBrowserPush(
  registration: ServiceWorkerRegistration,
  publicKey: Uint8Array<ArrayBuffer>,
  signal: AbortSignal,
  timeoutMs = 20000
) {
  signal.throwIfAborted();
  const manager = registration.pushManager;
  let pending = pendingSubscriptions.get(manager);
  if (pending?.cleanup) {
    await pending.cleanup;
    signal.throwIfAborted();
    return subscribeBrowserPush(registration, publicKey, signal, timeoutMs);
  }
  if (!pending) {
    pending = {
      promise: manager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      }),
      waiters: 0,
    };
    pendingSubscriptions.set(manager, pending);
    const operation = pending;
    void operation.promise
      .then(
        async (subscription) => {
          // Retain a cleanup barrier until native unsubscription finishes. A retry
          // must not register this endpoint while an older request is removing it.
          if (!operation.waiters) {
            operation.cleanup = (async () => {
              await subscription.unsubscribe();
            })();
            try {
              await operation.cleanup;
            } finally {
              pendingSubscriptions.delete(manager);
            }
          } else pendingSubscriptions.delete(manager);
        },
        () => {
          pendingSubscriptions.delete(manager);
        }
      )
      .catch(() => undefined);
  }
  pending.waiters++;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([
      pending.promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                '브라우저 알림 서버가 응답하지 않아요. 네트워크를 확인하고 다시 시도해 주세요.'
              )
            ),
          timeoutMs
        );
        abort = () =>
          reject(signal.reason || new DOMException('aborted', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
      }),
    ]);
  } finally {
    pending.waiters--;
    if (timeout) clearTimeout(timeout);
    if (abort) signal.removeEventListener('abort', abort);
  }
}

let pendingPermission: Promise<NotificationPermission> | null = null;
export async function requestPushPermission(
  signal: AbortSignal,
  timeoutMs = 30000
) {
  signal.throwIfAborted();
  if (Notification.permission !== 'default') return Notification.permission;
  // Keep the native promise so retries do not stack permission prompts.
  if (!pendingPermission) {
    pendingPermission = Notification.requestPermission();
    void pendingPermission.then(
      () => {
        pendingPermission = null;
      },
      () => {
        pendingPermission = null;
      }
    );
  }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    return await Promise.race([
      pendingPermission,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                '알림 권한 응답을 기다리다 멈췄어요. 브라우저의 허용 창이나 사이트 설정을 확인해 주세요. 창이 보이지 않으면 Chrome·Safari 등 일반 브라우저에서 다시 열어 주세요.'
              )
            ),
          timeoutMs
        );
        abort = () =>
          reject(signal.reason || new DOMException('aborted', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (abort) signal.removeEventListener('abort', abort);
  }
}

export async function ensureBrowserPushSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: Uint8Array<ArrayBuffer>,
  signal: AbortSignal
) {
  signal.throwIfAborted();
  const manager = registration.pushManager;
  let subscription: PushSubscription | null;
  for (;;) {
    const before = pendingSubscriptions.get(manager)?.cleanup;
    if (before) await before;
    signal.throwIfAborted();
    subscription = await manager.getSubscription();
    signal.throwIfAborted();
    const after = pendingSubscriptions.get(manager)?.cleanup;
    if (!after) break;
    await after;
  }
  const previousKey = subscription?.options.applicationServerKey;
  const matches =
    previousKey &&
    previousKey.byteLength === publicKey.byteLength &&
    new Uint8Array(previousKey).every(
      (value, index) => value === publicKey[index]
    );
  if (subscription && !matches) {
    if (!(await subscription.unsubscribe()))
      throw new Error(
        '이전 알림 연결을 해제하지 못했어요. 브라우저의 사이트 설정을 확인한 뒤 다시 시도해 주세요.'
      );
    signal.throwIfAborted();
    subscription = null;
  }
  return subscription || subscribeBrowserPush(registration, publicKey, signal);
}
