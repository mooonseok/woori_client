export const THEME_STORAGE_KEY = 'woori.theme.v1';
export const THEME_OPTIONS = [
  {
    id: 'base',
    label: '기본',
    description: '우리의 기본 색',
    primary: '#1D6A65',
    soft: '#E3F2F0',
  },
  {
    id: 'spring',
    label: '봄 · 벚꽃',
    description: '벚꽃처럼 밝은 핑크',
    primary: '#F5BDD0',
    soft: '#FCEAF0',
  },
  {
    id: 'summer',
    label: '여름 · 스카이',
    description: '맑은 하늘색',
    primary: '#8DD3F5',
    soft: '#E9F6FE',
  },
  {
    id: 'autumn',
    label: '가을 · 브라운',
    description: '차분한 월넛 브라운',
    primary: '#79563E',
    soft: '#F0E7DC',
  },
  {
    id: 'winterA',
    label: '겨울 · 스노우',
    description: '눈과 얼음 · 겨울 비교안 A',
    primary: '#E2EDF4',
    soft: '#E6EFF6',
  },
  {
    id: 'winterB',
    label: '겨울 · 네이비',
    description: '깊은 네이비 · 겨울 비교안 B',
    primary: '#223B5B',
    soft: '#E8EEF5',
  },
] as const;
export type ThemeName = (typeof THEME_OPTIONS)[number]['id'];
export type ThemePreference = ThemeName | 'auto';
export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'auto' || THEME_OPTIONS.some((theme) => theme.id === value)
    ? (value as ThemePreference)
    : 'base';
}
export function seasonalTheme(date: Date): ThemeName {
  const month = new Date(date.getTime() + 9 * 60 * 60 * 1000).getUTCMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winterA';
}
export function resolveTheme(
  preference: ThemePreference,
  date: Date
): ThemeName {
  return preference === 'auto' ? seasonalTheme(date) : preference;
}
export function themeLabel(preference: ThemePreference): string {
  return preference === 'auto'
    ? '계절에 맞춰 자동'
    : THEME_OPTIONS.find((theme) => theme.id === preference)!.label;
}
