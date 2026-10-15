import type { FormEvent } from 'react';
import {
  Box,
  Button,
  Form,
  Input,
  Label,
  Option,
  Section,
  Select,
  Text,
  Textarea,
} from '@/components/atoms/ui';
import { BackHeader } from '@/components/molecules/back-header';
import { LoadError } from '@/components/molecules/load-state';
import type {
  InquiryCategory,
  InquiryDraft,
  InquiryField,
  InquiryFieldErrors,
} from '@/dto/inquiry.dto';
interface Props {
  demo: boolean;
  draft: InquiryDraft;
  categories: { value: InquiryCategory; label: string }[];
  errors: InquiryFieldErrors;
  bodyMax: number;
  // Unicode code points, the unit the server limits.
  bodyCount: number;
  dailyLimit: number;
  canSubmit: boolean;
  pending: boolean;
  error: string;
  onChange: (field: InquiryField, value: string) => void;
  onBlur: (field: InquiryField) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}
const describedBy = (...ids: (string | false | undefined)[]) =>
  ids.filter(Boolean).join(' ') || undefined;
export function InquiryFormView({
  demo,
  draft,
  categories,
  errors,
  bodyMax,
  bodyCount,
  dailyLimit,
  canSubmit,
  pending,
  error,
  onChange,
  onBlur,
  onSubmit,
  onBack,
}: Props) {
  return (
    <Section className='service-page' aria-labelledby='inquiry-new-title'>
      <BackHeader
        title='문의하기'
        titleId='inquiry-new-title'
        onBack={onBack}
        disabled={pending}
      />
      {demo ? (
        <LoadError
          title='미리보기에서는 문의를 보낼 수 없어요'
          message='로그인한 계정에서 문의를 보낼 수 있어요.'
          backLabel='문의 내역으로'
          onBack={onBack}
        />
      ) : (
        <Form
          className='stack-form service-form'
          noValidate
          aria-busy={pending}
          onSubmit={onSubmit}
        >
          <Box className='notice-panel'>
            <Text id='inquiry-sensitive-help'>
              비밀번호나 인증 링크 같은 민감한 정보는 적지 마세요.
            </Text>
            <Text className='field-help'>
              문의는 하루 {dailyLimit}건까지 보낼 수 있어요.
            </Text>
          </Box>
          <Box className='service-field'>
            <Label htmlFor='inquiry-category'>문의 분류</Label>
            <Select
              id='inquiry-category'
              name='category'
              value={draft.category}
              required
              disabled={pending}
              aria-invalid={!!errors.category}
              aria-describedby={describedBy(
                errors.category && 'inquiry-category-error'
              )}
              onChange={(event) => onChange('category', event.target.value)}
              onBlur={() => onBlur('category')}
            >
              <Option value='' disabled>
                분류를 선택해 주세요
              </Option>
              {categories.map((category) => (
                <Option key={category.value} value={category.value}>
                  {category.label}
                </Option>
              ))}
            </Select>
            {errors.category && (
              <Text id='inquiry-category-error' className='form-error'>
                {errors.category}
              </Text>
            )}
          </Box>
          <Box className='service-field'>
            <Label htmlFor='inquiry-title'>제목</Label>
            <Input
              id='inquiry-title'
              name='title'
              value={draft.title}
              required
              autoComplete='off'
              disabled={pending}
              aria-invalid={!!errors.title}
              aria-describedby={describedBy(
                errors.title && 'inquiry-title-error'
              )}
              onChange={(event) => onChange('title', event.target.value)}
              onBlur={() => onBlur('title')}
            />
            {errors.title && (
              <Text id='inquiry-title-error' className='form-error'>
                {errors.title}
              </Text>
            )}
          </Box>
          <Box className='service-field'>
            <Label htmlFor='inquiry-body'>내용</Label>
            <Textarea
              id='inquiry-body'
              name='body'
              value={draft.body}
              required
              rows={8}
              disabled={pending}
              aria-invalid={!!errors.body}
              aria-describedby={describedBy(
                'inquiry-sensitive-help',
                'inquiry-body-count',
                errors.body && 'inquiry-body-error'
              )}
              onChange={(event) => onChange('body', event.target.value)}
              onBlur={() => onBlur('body')}
            />
            <Text id='inquiry-body-count' className='field-help service-count'>
              {bodyCount.toLocaleString('ko-KR')} /{' '}
              {bodyMax.toLocaleString('ko-KR')}자
            </Text>
            {errors.body && (
              <Text id='inquiry-body-error' className='form-error'>
                {errors.body}
              </Text>
            )}
          </Box>
          {error && (
            <Text role='alert' className='form-error'>
              {error}
            </Text>
          )}
          <Button
            type='submit'
            className='primary'
            disabled={!canSubmit}
            aria-describedby={
              !canSubmit && !pending ? 'inquiry-submit-help' : undefined
            }
          >
            {pending ? '보내는 중…' : '문의 보내기'}
          </Button>
          {!canSubmit && !pending && (
            <Text id='inquiry-submit-help' className='field-help'>
              분류를 고르고 제목과 내용을 입력하면 보낼 수 있어요.
            </Text>
          )}
        </Form>
      )}
    </Section>
  );
}
