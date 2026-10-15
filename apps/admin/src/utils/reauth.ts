import { ADMIN_ERROR } from '../constants/admin-auth.ts';

export function isReauthRequired(error: unknown) {
  const value = error as { status?: unknown; code?: unknown } | null;
  return value?.status === 403 && value.code === ADMIN_ERROR.REAUTH_REQUIRED;
}
export class ReauthCancelledError extends Error {
  constructor() {
    super('재인증을 취소해 작업을 진행하지 않았어요.');
    this.name = 'ReauthCancelledError';
  }
}
// Runs a sensitive action. When the server answers 403 ADMIN_REAUTH_REQUIRED
// it asks for re-authentication and retries exactly once; a second refusal,
// a cancelled prompt or any other error is passed to the caller.
export async function runWithReauth<T>(
  action: () => Promise<T>,
  reauthenticate: () => Promise<boolean>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!isReauthRequired(error)) throw error;
  }
  if (!(await reauthenticate())) throw new ReauthCancelledError();
  return action();
}

// One shared prompt: concurrent sensitive actions wait for the same dialog.
export interface ReauthPrompt {
  request: () => Promise<boolean>;
  settle: (confirmed: boolean) => void;
  isOpen: () => boolean;
}
export function createReauthPrompt(onChange: (open: boolean) => void) {
  let pending: Promise<boolean> | null = null;
  let resolve: ((confirmed: boolean) => void) | null = null;
  const prompt: ReauthPrompt = {
    request() {
      if (pending) return pending;
      pending = new Promise<boolean>((done) => {
        resolve = done;
      });
      onChange(true);
      return pending;
    },
    settle(confirmed) {
      const done = resolve;
      pending = null;
      resolve = null;
      if (!done) return;
      onChange(false);
      done(confirmed);
    },
    isOpen: () => pending !== null,
  };
  return prompt;
}
