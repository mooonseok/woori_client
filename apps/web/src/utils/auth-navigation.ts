export function safeReturnTo(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\r\n]/.test(value)
  )
    return '/';
  try {
    const url = new URL(value, 'https://woori.invalid');
    if (url.origin !== 'https://woori.invalid') return '/';
    // Only explicit invitation and notification targets survive authentication.
    const route = url.pathname.replace(/\/$/, '');
    if (route === '/notifications') {
      const id = url.searchParams.get('notificationId');
      return id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id
        )
        ? `/notifications?notificationId=${id}`
        : '/notifications';
    }
    if (route !== '/invite' && route !== '/verify-email') return '/';
    const result = new URLSearchParams();
    const token = url.searchParams.get('token'),
      code = url.searchParams.get('code');
    if (token && /^[a-zA-Z0-9_-]{16,200}$/.test(token))
      result.set('token', token);
    else if (code && /^[a-zA-Z0-9-]{4,32}$/.test(code))
      result.set('code', code);
    if (route === '/verify-email') {
      const next = url.searchParams.get('next');
      if (next?.startsWith('/invite')) result.set('next', safeReturnTo(next));
    }
    return `${route}${result.size ? `?${result}` : ''}`;
  } catch {
    return '/';
  }
}
export function authDestination(
  path: '/login' | '/signup' | '/verify-email',
  next: string
) {
  return `${path}?next=${encodeURIComponent(safeReturnTo(next))}`;
}
