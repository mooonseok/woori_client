// The HTTP operation may finish after a browser Back action. Preserve the session
// result, but never pull the user back into a flow they already left.
export function beginAuthNavigation(host: {
  location: { href: string };
  addEventListener: (type: 'popstate', listener: () => void) => void;
  removeEventListener: (type: 'popstate', listener: () => void) => void;
}) {
  const href = host.location.href;
  let departed = false;
  const leave = () => {
    departed = true;
  };
  host.addEventListener('popstate', leave);
  return {
    canNavigate: () => !departed && host.location.href === href,
    dispose: () => host.removeEventListener('popstate', leave),
  };
}
