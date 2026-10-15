'use client';
import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { startMfaSetup } from '@/services/admin-auth';
import { mfaFailure, type MfaFailure } from '@/utils/admin-errors';

export interface MfaEnrollment {
  secret: string;
  qrDataUrl: string;
}
// Each setup call replaces the pending secret on the server, so calls are
// serialized: a remount (or StrictMode's double effect) never shows a secret
// that a later request has already replaced.
let setupChain: Promise<unknown> = Promise.resolve();
// The secret lives only in this component state: never in storage, the URL
// or logs. forget() drops it after activation; unmount discards it.
export function useMfaSetup(enabled: boolean) {
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [failure, setFailure] = useState<MfaFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    const run = setupChain.then(async () => {
      if (!active) return;
      setEnrollment(null);
      setFailure(null);
      setLoading(true);
      try {
        const result = await startMfaSetup(controller.signal);
        const qrDataUrl = await QRCode.toDataURL(result.otpauthUri, {
          width: 224,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#1e2023', light: '#ffffff' },
        });
        if (active) setEnrollment({ secret: result.secret, qrDataUrl });
      } catch (cause) {
        if (active && !controller.signal.aborted) setFailure(mfaFailure(cause));
      } finally {
        if (active) setLoading(false);
      }
    });
    setupChain = run.catch(() => undefined);
    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, attempt]);
  return {
    enrollment,
    loading,
    failure,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
    forget: useCallback(() => setEnrollment(null), []),
  };
}
