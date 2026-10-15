'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AdminReauthInput } from '@/dto/admin-auth.dto';
import { createReauthPrompt, runWithReauth } from '@/utils/reauth';
import { useAdminSession } from './use-admin-session';

function useReauthState() {
  const { reauthenticate } = useAdminSession();
  const [open, setOpen] = useState(false);
  const [prompt] = useState(() => createReauthPrompt(setOpen));
  // Leaving the console (logout, session loss, admin switch) cancels a
  // pending prompt so the waiting action rejects instead of hanging.
  useEffect(() => () => prompt.settle(false), [prompt]);
  const run = useCallback(
    <T,>(action: () => Promise<T>) => runWithReauth(action, prompt.request),
    [prompt]
  );
  return {
    open,
    // Runs a sensitive action; on 403 ADMIN_REAUTH_REQUIRED it opens the
    // dialog and retries once after a successful re-authentication.
    run,
    // Opens the dialog ahead of sensitive work; resolves true on success.
    request: prompt.request,
    submit: async (input: AdminReauthInput) => {
      await reauthenticate(input);
      prompt.settle(true);
    },
    cancel: () => prompt.settle(false),
  };
}
const ReauthContext = createContext<ReturnType<typeof useReauthState> | null>(
  null
);
export function ReauthProvider({ children }: { children: ReactNode }) {
  const value = useReauthState();
  return (
    <ReauthContext.Provider value={value}>{children}</ReauthContext.Provider>
  );
}
export function useReauth() {
  const value = useContext(ReauthContext);
  if (!value) throw new Error('ReauthProvider required');
  return value;
}
