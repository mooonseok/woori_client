import { Fieldset, Input, Label, Legend, Span } from '@/components/atoms/ui';
import {
  THEME_OPTIONS,
  themeLabel,
  type ThemeName,
  type ThemePreference,
} from '@/utils/theme';
interface Props {
  preference: ThemePreference;
  resolvedTheme: ThemeName;
  onChange: (value: ThemePreference) => void;
}
export function ThemePicker({ preference, resolvedTheme, onChange }: Props) {
  const current = THEME_OPTIONS.find((theme) => theme.id === resolvedTheme)!;
  const options = [
    THEME_OPTIONS[0],
    {
      id: 'auto' as const,
      label: '계절에 맞춰 자동',
      description: `한국 시간 기준 · ${preference === 'auto' ? `지금은 ${themeLabel(resolvedTheme)} · ` : ''}겨울에는 스노우 적용`,
      primary: current.primary,
      soft: current.soft,
    },
    ...THEME_OPTIONS.slice(1),
  ];
  return (
    <Fieldset className='theme-picker'>
      <Legend className='sr-only'>화면 테마 선택</Legend>
      {options.map((theme) => (
        <Label className='theme-option' key={theme.id}>
          <Input
            type='radio'
            name='screen-theme'
            value={theme.id}
            checked={preference === theme.id}
            onChange={() => onChange(theme.id)}
          />
          <Span className='theme-swatches' aria-hidden='true'>
            <Span
              className='theme-swatch'
              style={{ background: theme.primary }}
            />
            <Span className='theme-swatch' style={{ background: theme.soft }} />
          </Span>
          <Span className='theme-option-copy'>
            <Span className='theme-option-title'>{theme.label}</Span>
            <Span className='theme-option-description'>
              {theme.description}
            </Span>
          </Span>
          {preference === theme.id && (
            <Span className='theme-current'>선택됨</Span>
          )}
        </Label>
      ))}
    </Fieldset>
  );
}
