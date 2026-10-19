'use client';
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeName,
  type ThemePreference,
} from '@/utils/theme';

let preference: ThemePreference = 'base';
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function readStoredPreference() {
  try {
    preference = parseThemePreference(
      window.localStorage.getItem(THEME_STORAGE_KEY)
    );
  } catch {
    /* Keep the in-memory selection when storage is unavailable. */
  }
}
function subscribe(listener: () => void) {
  if (listeners.size === 0) readStoredPreference();
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      readStoredPreference();
      emit();
    }
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') emit();
  };
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', onVisible);
  const timer = window.setInterval(emit, 60_000);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(timer);
  };
}
function snapshot() {
  return `${preference}:${resolveTheme(preference, new Date())}`;
}
function serverSnapshot() {
  return 'base:base';
}
function setPreference(value: ThemePreference) {
  preference = parseThemePreference(value);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* Themes remain usable without browser storage. */
  }
  emit();
}
interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ThemeName;
  setPreference: (value: ThemePreference) => void;
}
const ThemeContext = createContext<ThemeContextValue>({
  preference: 'base',
  resolvedTheme: 'base',
  setPreference,
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [selected, resolved] = value.split(':') as [ThemePreference, ThemeName];
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);
  return (
    <ThemeContext.Provider
      value={{ preference: selected, resolvedTheme: resolved, setPreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
