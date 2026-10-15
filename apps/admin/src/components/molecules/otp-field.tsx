import type { Ref } from 'react';
import { Box, Input, Label, Text } from '@/components/atoms/ui';
// Six-digit authenticator code. The caller normalizes pasted text, so no
// maxLength here ("123 456" must not be cut before normalizing).
export function OtpField({
  id,
  label = '인증 코드',
  value,
  error,
  help,
  disabled,
  inputRef,
  onChange,
}: {
  id: string;
  label?: string;
  value: string;
  error?: string;
  help?: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
}) {
  const describedBy =
    [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') ||
    undefined;
  return (
    <Box className='field'>
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        name='code'
        className='otp-input'
        inputMode='numeric'
        autoComplete='one-time-code'
        autoCapitalize='none'
        spellCheck={false}
        placeholder='000000'
        required
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
      {help && (
        <Text id={`${id}-help`} className='field-help'>
          {help}
        </Text>
      )}
      {error && (
        <Text id={`${id}-error`} className='field-error'>
          {error}
        </Text>
      )}
    </Box>
  );
}
