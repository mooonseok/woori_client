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
  AuthStatus,
  AuthUser,
  LoginInput,
  SignupInput,
} from '@/dto/auth.dto';
import {
  advanceSessionRevision,
  ApiError,
  apiRequest,
  post,
  SESSION_EXPIRED,
} from '@/services/api-client';
import { updateProfile } from '@/services/recovery';
import { clearBrowserPush } from '@/services/web-push';
import * as accountSettings from '@/services/account-settings';
import type {
  AccountDeletionInput,
  PasswordChangeInput,
} from '@/dto/account-settings.dto';
import { createCredentialChanges } from '@/services/credential-changes';
import { DEMO_MODE } from '@/constants/app-mode';
function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    DEMO_MODE ? 'anonymous' : 'loading'
  );
  const [error, setError] = useState('');
  const [verificationDelivery, setVerificationDelivery] = useState<
    'sent' | 'unavailable' | null
  >(null);
  const generation = useRef(0);
  const credentialChanges = useRef(createCredentialChanges(clearBrowserPush));
  const identityId = useRef<string | null>(null);
  const clear = useCallback(() => {
    generation.current++;
    advanceSessionRevision();
    setUser(null);
    setStatus('anonymous');
    setError('');
  }, []);
  const refresh = useCallback(async (quiet = false) => {
    if (DEMO_MODE) return;
    const request = ++generation.current;
    if (!quiet) {
      setStatus('loading');
      setError('');
    }
    try {
      const result = await apiRequest<{ user: AuthUser }>('/v1/auth/me');
      if (request === generation.current) {
        if (identityId.current !== result.user.id) {
          credentialChanges.current.identityChanged();
          identityId.current = result.user.id;
        }
        setUser(result.user);
        setStatus('authenticated');
      }
    } catch (error) {
      if (request !== generation.current) return;
      if (quiet && !(error instanceof ApiError && error.status === 401)) return;
      setUser(null);
      if (error instanceof ApiError && error.status === 401)
        setStatus('anonymous');
      else {
        setStatus('error');
        setError(
          error instanceof Error ? error.message : '계정을 확인하지 못했어요.'
        );
      }
    }
  }, []);
  useEffect(() => {
    const expired = () => clear();
    window.addEventListener(SESSION_EXPIRED, expired);
    let active = true;
    const counter = generation;
    queueMicrotask(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
      counter.current++;
      window.removeEventListener(SESSION_EXPIRED, expired);
    };
  }, [refresh, clear]);
  useEffect(() => {
    if (!user || user.emailVerified) return;
    const focus = () => {
      void refresh(true);
    };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [user, refresh]);
  async function authenticate(
    path: 'login' | 'signup',
    input: LoginInput | SignupInput
  ) {
    const request = ++generation.current;
    credentialChanges.current.identityChanged();
    advanceSessionRevision();
    await credentialChanges.current.waitForCleanup();
    if (request !== generation.current)
      throw new Error('계정 상태가 바뀌었어요. 다시 로그인해 주세요.');
    await clearBrowserPush().catch(() => undefined);
    if (request !== generation.current)
      throw new Error('계정 상태가 바뀌었어요. 다시 로그인해 주세요.');
    const result = await post<{
      user: AuthUser;
      verificationDelivery?: 'sent' | 'unavailable';
    }>(`/v1/auth/${path}`, input);
    if (request === generation.current) {
      identityId.current = result.user.id;
      setVerificationDelivery(result.verificationDelivery || null);
      setUser(result.user);
      setStatus('authenticated');
      setError('');
    } else throw new Error('계정 상태가 바뀌었어요. 다시 로그인해 주세요.');
    return result.user;
  }
  async function logout() {
    const request = ++generation.current;
    credentialChanges.current.identityChanged();
    advanceSessionRevision();
    await post<void>('/v1/auth/logout');
    await clearBrowserPush().catch(() => undefined);
    if (request === generation.current) clear();
  }
  async function confirm(token: string) {
    const request = ++generation.current;
    credentialChanges.current.identityChanged();
    advanceSessionRevision();
    const result = await post<{ user: AuthUser }>(
      '/v1/auth/email-verification/confirm',
      { token }
    );
    if (request === generation.current) {
      identityId.current = result.user.id;
      setUser(result.user);
      setStatus('authenticated');
    }
    return result.user;
  }
  async function saveProfile(profile: {
    displayName?: string;
    nickname?: string;
  }) {
    const request = ++generation.current;
    const result = await updateProfile(profile);
    if (request !== generation.current)
      throw new Error('계정 상태가 바뀌었어요. 다시 확인해 주세요.');
    setUser(result.user);
    return result.user;
  }
  // Changes that answer with the updated account (profile photo upload or
  // removal); a session change meanwhile discards the answer.
  async function applyUser(change: () => Promise<{ user: AuthUser }>) {
    const request = ++generation.current;
    const result = await change();
    if (request !== generation.current)
      throw new Error('계정 상태가 바뀌었어요. 다시 확인해 주세요.');
    setUser(result.user);
    return result.user;
  }
  async function changeCredentials(
    action: () => Promise<void>,
    onChanged: () => void
  ) {
    await credentialChanges.current.run(action, () => {
      // Same-session polling can already have received a 401 after commit.
      // Still finish cleanup/navigation, unless a different login has started.
      clear();
      onChanged();
    });
  }
  return {
    user,
    status,
    error,
    verificationDelivery,
    refresh,
    saveProfile,
    applyUser,
    logout,
    confirm,
    deleteAccount: (input: AccountDeletionInput, onChanged: () => void) => {
      if (DEMO_MODE)
        return Promise.reject(
          new Error('미리보기에서는 회원 탈퇴를 할 수 없어요.')
        );
      return changeCredentials(
        () => accountSettings.deleteAccount(input),
        onChanged
      );
    },
    changePassword: (input: PasswordChangeInput, onChanged: () => void) =>
      changeCredentials(() => accountSettings.changePassword(input), onChanged),
    confirmEmailChange: (token: string, onChanged: () => void) =>
      changeCredentials(
        () => accountSettings.confirmEmailChange(token),
        onChanged
      ),
    login: (input: LoginInput) => authenticate('login', input),
    signup: (input: SignupInput) => authenticate('signup', input),
    resend: () => post('/v1/auth/email-verification/request'),
  };
}
const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider required');
  return value;
}
