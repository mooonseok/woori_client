import assert from 'node:assert/strict';
import test from 'node:test';
import { beginAuthNavigation } from '../src/services/auth-navigation-attempt.ts';
function host() {
  const listeners = new Set<() => void>();
  return {
    location: { href: 'https://woori.test/login?next=%2Finvite' },
    addEventListener: (_type: 'popstate', listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: 'popstate', listener: () => void) => {
      listeners.delete(listener);
    },
    pop: () => {
      listeners.forEach((listener) => listener());
    },
    listeners,
  };
}
test('authentication can navigate while the initiating route is unchanged', () => {
  const browser = host();
  const attempt = beginAuthNavigation(browser);
  assert.equal(attempt.canNavigate(), true);
  attempt.dispose();
  assert.equal(browser.listeners.size, 0);
});
test('a late login result cannot navigate after Back, even if Forward returns to the same URL', () => {
  const browser = host();
  const attempt = beginAuthNavigation(browser);
  browser.pop();
  assert.equal(attempt.canNavigate(), false);
  attempt.dispose();
});
test('route or invitation changes invalidate the initiating navigation', () => {
  const browser = host();
  const attempt = beginAuthNavigation(browser);
  browser.location.href = 'https://woori.test/signup';
  assert.equal(attempt.canNavigate(), false);
  attempt.dispose();
});
