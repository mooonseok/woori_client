'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useGallery } from '@/hooks/use-gallery';
import { DEMO_MODE } from '@/constants/app-mode';
import { ApiError } from '@/services/api-client';
import { getAccountDeletionPreview } from '@/services/account-settings';
import type { AccountDeletionPreview } from '@/dto/account-settings.dto';
import { AccountDeletionView } from './account-deletion-view';

export function AccountDeletionContainer() {
  const auth = useAuth(),
    router = useRouter(),
    gallery = useGallery();
  const [preview, setPreview] = useState<AccountDeletionPreview | null>(null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const request = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const load = useCallback(async () => {
    if (DEMO_MODE) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setPreview(null);
    setLoadError('');
    try {
      const result = await getAccountDeletionPreview(controller.signal);
      if (!controller.signal.aborted) setPreview(result);
    } catch (cause) {
      if (!controller.signal.aborted)
        setLoadError(
          cause instanceof Error
            ? cause.message
            : '계정 상태를 확인하지 못했어요.'
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => {
      if (mounted.current) void load();
    });
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      DEMO_MODE ||
      submitting.current ||
      loading ||
      !preview?.canDelete ||
      !auth.user
    )
      return;
    const form = event.currentTarget,
      data = new FormData(form);
    setError('');
    if (data.get('confirmation') !== '탈퇴') {
      setError('확인란에 ‘탈퇴’를 정확히 입력해 주세요.');
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      await auth.deleteAccount(
        {
          currentPassword: String(data.get('currentPassword')),
          confirmation: '탈퇴',
        },
        () => {
          form.reset();
          router.replace('/account-deleted');
        }
      );
    } catch (cause) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : '탈퇴하지 못했어요. 다시 확인해 주세요.'
        );
        if (cause instanceof ApiError && cause.status === 409) await load();
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return (
    <AccountDeletionView
      demo={DEMO_MODE}
      preview={preview}
      loading={loading}
      pending={pending}
      error={error}
      loadError={loadError}
      onRetry={() => void load()}
      onSubmit={submit}
      onBack={() => router.push('/account-settings')}
      onManageGroup={(id) => {
        gallery.setGroupId(id);
        router.push('/groups');
      }}
    />
  );
}
