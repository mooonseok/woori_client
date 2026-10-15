'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AdminLoginInput,
  AdminReauthInput,
  AdminSession,
  AdminSessionStatus,
  SessionEndReason,
} from '@/dto/admin-auth.dto';
import {
  ADMIN_SESSION_EXPIRED,
  ADMIN_SESSION_RECHECK,
  advanceSessionRevision,
} from '@/services/api-client';
import {
  activateMfa,
  fetchAdminSession,
  loginAdmin,
  logoutAdmin,
  reauthenticateAdmin,
  verifyMfa,
} from '@/services/admin-auth';
import { messageOf, statusOf } from '@/utils/admin-errors';

const STALE_MESSAGE = '관리자 세션이 바뀌었어요. 다시 시도해 주세요.';
// Focus/visibility checks closer together than this reuse the last answer.
const FOCUS_CHECK_INTERVAL = 5_000;
const MAX_TIMER = 2_147_000_000;
interface RefreshOptions {
  quiet?: boolean;
  // Notice shown on the login screen if this check finds the session gone.
  lostReason?: SessionEndReason;
}
function useAdminSessionState() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [status, setStatus] = useState<AdminSessionStatus>('loading');
  const [error, setError] = useState('');
  const [endReason, setEndReason] = useState<SessionEndReason | null>(null);
  // Any login, logout, MFA step or loss bumps this; older answers are ignored.
  const generation = useRef(0);
  // Session-changing requests in flight; background checks wait for them.
  const mutating = useRef(0);
  const identity = useRef<string | null>(null);
  const hasSession = useRef(false);
  const lostReason = useRef<SessionEndReason>('expired');
  const lastCheck = useRef(0);
  const clear = useCallback((reason: SessionEndReason | null) => {
    generation.current++;
    advanceSessionRevision();
    identity.current = null;
    hasSession.current = false;
    setSession(null);
    setStatus('anonymous');
    setError('');
    setEndReason(reason);
  }, []);
  const accept = useCallback((next: AdminSession) => {
    if (identity.current !== next.admin.id) {
      // A different admin now owns the cookie (e.g. another tab): requests
      // started for the previous admin must not land in this session.
      if (identity.current !== null) advanceSessionRevision();
      identity.current = next.admin.id;
    }
    hasSession.current = true;
    setSession(next);
    setStatus('authenticated');
    setError('');
    setEndReason(null);
  }, []);
  const refresh = useCallback(
    async ({ quiet = false, lostReason: reason }: RefreshOptions = {}) => {
      if (mutating.current > 0) return;
      const request = ++generation.current;
      lastCheck.current = Date.now();
      if (!quiet) {
        setStatus('loading');
        setError('');
      }
      if (reason) lostReason.current = reason;
      try {
        const next = await fetchAdminSession();
        if (request === generation.current) accept(next);
      } catch (cause) {
        if (request !== generation.current) return;
        if (statusOf(cause) === 401) {
          if (hasSession.current) clear(lostReason.current);
          else {
            setSession(null);
            setStatus('anonymous');
          }
          return;
        }
        if (quiet) return;
        hasSession.current = false;
        identity.current = null;
        setSession(null);
        setStatus('error');
        setError(messageOf(cause, '관리자 계정을 확인하지 못했어요.'));
      } finally {
        lostReason.current = 'expired';
      }
    },
    [accept, clear]
  );
  useEffect(() => {
    const expired = () => {
      if (hasSession.current) clear(lostReason.current);
    };
    const recheck = () => void refresh({ quiet: true });
    const focus = () => {
      if (Date.now() - lastCheck.current > FOCUS_CHECK_INTERVAL)
        void refresh({ quiet: true });
    };
    const visible = () => {
      if (document.visibilityState === 'visible') focus();
    };
    window.addEventListener(ADMIN_SESSION_EXPIRED, expired);
    window.addEventListener(ADMIN_SESSION_RECHECK, recheck);
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visible);
    let active = true;
    const counter = generation;
    queueMicrotask(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
      counter.current++;
      window.removeEventListener(ADMIN_SESSION_EXPIRED, expired);
      window.removeEventListener(ADMIN_SESSION_RECHECK, recheck);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh, clear]);
  // Re-check once the absolute expiry passes so the console does not keep
  // showing data for a session the server has already ended. The absolute
  // expiry never slides, so this check cannot keep an idle session alive.
  const expiresAt = session?.sessionExpiresAt ?? null;
  useEffect(() => {
    const time = expiresAt ? Date.parse(expiresAt) : NaN;
    if (!Number.isFinite(time)) return;
    const delay = Math.min(
      Math.max(time - Date.now() + 2_000, 30_000),
      MAX_TIMER
    );
    const timer = window.setTimeout(() => void refresh({ quiet: true }), delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt, refresh]);
  async function mutate<T>(run: () => Promise<T>, apply: (value: T) => void) {
    const request = ++generation.current;
    mutating.current++;
    try {
      const value = await run();
      if (request !== generation.current) throw new Error(STALE_MESSAGE);
      apply(value);
      return value;
    } finally {
      mutating.current--;
    }
  }
  const sessionStep = (run: () => Promise<AdminSession>) => {
    const owner = identity.current;
    return mutate(run, (next) => {
      if (next.admin.id !== owner) throw new Error(STALE_MESSAGE);
      accept(next);
    });
  };
  return {
    session,
    status,
    error,
    endReason,
    refresh,
    login: (input: AdminLoginInput) => {
      advanceSessionRevision();
      return mutate(
        () => loginAdmin(input),
        (result) => {
          identity.current = result.admin.id;
          accept({
            admin: result.admin,
            mfa: result.mfa,
            sessionExpiresAt: null,
            reauthValidUntil: null,
          });
        }
      );
    },
    activateMfa: (code: string) => sessionStep(() => activateMfa(code)),
    verifyMfa: (code: string) => sessionStep(() => verifyMfa(code)),
    reauthenticate: (input: AdminReauthInput) =>
      sessionStep(() => reauthenticateAdmin(input)),
    logout: async () => {
      generation.current++;
      mutating.current++;
      try {
        await logoutAdmin();
      } catch (cause) {
        // 401: the server session was already gone; finish the local logout.
        if (statusOf(cause) !== 401) throw cause;
      } finally {
        mutating.current--;
      }
      clear('logout');
    },
  };
}
export type AdminSessionValue = ReturnType<typeof useAdminSessionState>;
const AdminSessionContext = createContext<AdminSessionValue | null>(null);
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const value = useAdminSessionState();
  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}
export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error('AdminSessionProvider required');
  return value;
}
