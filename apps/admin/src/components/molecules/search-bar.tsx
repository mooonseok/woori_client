import type { FormEvent } from 'react';
import { Box, Button, Form, Input, Label } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
// Search runs on submit only (no request per keystroke).
export function SearchBar({
  id,
  label,
  placeholder,
  value,
  active,
  max,
  onChange,
  onSubmit,
  onClear,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  active: string;
  max: number;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
}) {
  return (
    <Form className='search-bar' role='search' onSubmit={onSubmit}>
      <Box className='field field-inline'>
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type='search'
          autoComplete='off'
          spellCheck={false}
          maxLength={max}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </Box>
      <Button type='submit' className='secondary-button'>
        <Icon name='search' size={18} />
        검색
      </Button>
      {active && (
        <Button className='text-button' onClick={onClear}>
          ‘{active}’ 검색 지우기
        </Button>
      )}
    </Form>
  );
}
