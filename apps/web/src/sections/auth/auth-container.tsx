'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { authDestination, safeReturnTo } from '@/utils/auth-navigation';
import { rememberInvite } from '@/services/invite-return';
import { loginFailure } from '@/utils/auth-errors';
import { GuestHome } from '@/components/organisms/guest-home/guest-home';
import { AuthDialog } from '@/components/organisms/auth-dialog/auth-dialog';
import { beginAuthNavigation } from '@/services/auth-navigation-attempt';
import { AuthView } from './auth-view';
export function AuthContainer({ signup = false }: { signup?: boolean }) {
  const auth = useAuth(),
    router = useRouter(),
    search = useSearchParams();
  const next = safeReturnTo(search.get('next'));
  const [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [suspended, setSuspended] = useState(false),
    [passwordVisible, setPasswordVisible] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const navigation = beginAuthNavigation(window);
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    setSuspended(false);
    rememberInvite(next);
    try {
      const credentials = {
        username: String(data.get('username')).trim(),
        password: String(data.get('password')),
      };
      const user = signup
        ? await auth.signup({
            ...credentials,
            displayName: String(data.get('displayName')).trim(),
            email: String(data.get('email')).trim(),
          })
        : await auth.login(credentials);
      if (navigation.canNavigate())
        router.replace(
          next.startsWith('/verify-email') || user.emailVerified
            ? next
            : authDestination('/verify-email', next)
        );
    } catch (error) {
      // No automatic retry: a suspended account stays refused until the
      // operator lifts it, so the member only sees one clear message.
      if (!mounted.current || !navigation.canNavigate()) return;
      const failure = loginFailure(error);
      setError(failure.message);
      setSuspended(failure.suspended);
    } finally {
      navigation.dispose();
      submitting.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return (
    <>
      <GuestHome next={next} />
      <AuthDialog
        pending={pending}
        onClose={() => {
          if (!submitting.current)
            router.replace(next.startsWith('/invite') ? next : '/');
        }}
      >
        <AuthView
          signup={signup}
          passwordVisible={passwordVisible}
          onPasswordVisibilityChange={() =>
            setPasswordVisible((current) => !current)
          }
          invitation={next.startsWith('/invite')}
          pending={pending}
          error={error}
          suspended={suspended}
          passwordReset={search.get('passwordReset') === '1'}
          emailChanged={search.get('emailChanged') === '1'}
          recoveryNext={next}
          alternate={authDestination(signup ? '/login' : '/signup', next)}
          privacyHref={
            signup ? `/privacy?next=${encodeURIComponent(next)}` : undefined
          }
          onSubmit={submit}
        />
      </AuthDialog>
    </>
  );
}
