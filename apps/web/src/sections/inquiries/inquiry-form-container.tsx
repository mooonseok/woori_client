'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useGallery } from '@/hooks/use-gallery';
import { createInquiry } from '@/services/inquiries';
import { DEMO_MODE } from '@/constants/app-mode';
import { ROUTES } from '@/constants/routes';
import {
  INQUIRY_BODY_MAX,
  INQUIRY_CATEGORIES,
  INQUIRY_DAILY_LIMIT,
} from '@/constants/inquiry';
import { inquiryCategoryLabels } from '@/content/service-guide';
import {
  codePoints,
  inquiryErrorMessage,
  validateInquiryDraft,
} from '@/utils/service-guidance';
import type { InquiryDraft, InquiryField } from '@/dto/inquiry.dto';
import { InquiryFormView } from './inquiry-form-view';

const emptyDraft: InquiryDraft = { category: '', title: '', body: '' };
const untouched: Record<InquiryField, boolean> = {
  category: false,
  title: false,
  body: false,
};
function InquiryForm() {
  const router = useRouter(),
    { setToast } = useGallery();
  const [draft, setDraft] = useState<InquiryDraft>(emptyDraft);
  const [touched, setTouched] = useState(untouched);
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const { input, errors } = validateInquiryDraft(draft);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (DEMO_MODE || active.current) return;
    // Re-validate the latest draft; the disabled button is only a convenience.
    const checked = validateInquiryDraft(draft);
    if (!checked.input) {
      setTouched({ category: true, title: true, body: true });
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setError('');
    let created = false;
    try {
      const inquiry = await createInquiry(checked.input, controller.signal);
      if (controller.signal.aborted) return;
      created = true;
      setToast('문의를 보냈어요.');
      router.replace(`${ROUTES.INQUIRY}?id=${encodeURIComponent(inquiry.id)}`);
    } catch (cause) {
      if (!controller.signal.aborted) setError(inquiryErrorMessage(cause));
    } finally {
      // After success the form stays locked until navigation replaces it.
      if (!created && active.current === controller) {
        active.current = null;
        setPending(false);
      }
    }
  }
  return (
    <InquiryFormView
      demo={DEMO_MODE}
      draft={draft}
      categories={INQUIRY_CATEGORIES.map((value) => ({
        value,
        label: inquiryCategoryLabels[value],
      }))}
      errors={{
        category: touched.category ? errors.category : undefined,
        // Length/character problems show while typing; "empty" waits for blur.
        title: touched.title || draft.title.trim() ? errors.title : undefined,
        body: touched.body || draft.body.trim() ? errors.body : undefined,
      }}
      bodyMax={INQUIRY_BODY_MAX}
      bodyCount={codePoints(draft.body)}
      dailyLimit={INQUIRY_DAILY_LIMIT}
      canSubmit={!!input && !pending}
      pending={pending}
      error={error}
      onChange={(field, value) => {
        setDraft((current) => ({ ...current, [field]: value }));
        if (field === 'category')
          setTouched((current) => ({ ...current, category: true }));
      }}
      onBlur={(field) =>
        setTouched((current) =>
          current[field] ? current : { ...current, [field]: true }
        )
      }
      onSubmit={submit}
      onBack={() => router.push(ROUTES.INQUIRIES)}
    />
  );
}
export function InquiryFormContainer() {
  const { user } = useAuth();
  // A draft never survives an account change.
  return <InquiryForm key={user?.id ?? 'anonymous'} />;
}
