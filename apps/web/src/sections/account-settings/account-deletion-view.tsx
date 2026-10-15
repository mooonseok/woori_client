import type { FormEvent } from 'react';
import {
  Box,
  Button,
  Form,
  Heading,
  Input,
  Label,
  Section,
  Text,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import type { AccountDeletionPreview } from '@/dto/account-settings.dto';
interface Props {
  demo: boolean;
  preview: AccountDeletionPreview | null;
  loading: boolean;
  pending: boolean;
  error: string;
  loadError: string;
  onRetry: () => void;
  onBack: () => void;
  onManageGroup: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
export function AccountDeletionView(p: Props) {
  return (
    <Box className='auth-panel account-settings'>
      <Box className='inline-actions'>
        <Button
          className='icon-button'
          aria-label='뒤로 가기'
          onClick={p.onBack}
          disabled={p.pending}
        >
          <Icon name='back' />
        </Button>
        <Heading>회원 탈퇴</Heading>
      </Box>
      <Section className='notice-panel' aria-label='탈퇴 전에 확인해 주세요'>
        <Text>
          탈퇴하면 계정의 아이디·이메일·이름·비밀번호를 제거하고, 모든 기기의
          로그인과 알림 연결을 해제해요. 탈퇴는 취소하거나 복구할 수 없어요.
        </Text>
        <Text>
          공유한 사진과 댓글·반응은 그룹에 남고, 작성자는 ‘탈퇴한 회원’으로
          표시돼요.
        </Text>
        <Text>
          문의 내역과 차단 목록은 삭제돼요. 내가 한 신고는 대상·사유·처리 상태만
          남고, 추가로 적은 설명은 지워져요.
        </Text>
        <Text>
          사진 원본의 촬영·위치정보나 직접 적은 개인정보도 남을 수 있어요.
          삭제할 내용은 탈퇴 전에 정리해 주세요. 전송·처리 중인 사진은 취소돼요.
        </Text>
        <Text>
          같은 아이디와 이메일로 다시 가입할 수 있지만, 이전 그룹과 활동은
          복구되지 않아요.
        </Text>
      </Section>
      {p.demo ? (
        <Text role='status'>미리보기에서는 회원 탈퇴를 할 수 없어요.</Text>
      ) : p.loading ? (
        <Text role='status'>그룹장인 그룹을 확인하고 있어요…</Text>
      ) : p.loadError ? (
        <Box className='notice-panel'>
          <Text role='alert'>{p.loadError}</Text>
          <Button className='secondary-button' onClick={p.onRetry}>
            다시 확인
          </Button>
        </Box>
      ) : p.preview && !p.preview.canDelete ? (
        <Section className='notice-panel'>
          <Text role='status'>
            그룹장인 그룹 {p.preview.ownedGroupCount}개가 있어요. 각 그룹에서
            그룹장을 다른 회원에게 넘기거나 그룹을 삭제한 뒤 탈퇴할 수 있어요.
          </Text>
          {p.preview.ownedGroups.map((group) => (
            <Button
              key={group.id}
              className='group-list-row'
              onClick={() => p.onManageGroup(group.id)}
              aria-label={`${group.name} 그룹 관리`}
            >
              <Text>{group.name}</Text>
              <Icon name='chevron-right' />
            </Button>
          ))}
          {p.preview.ownedGroupCount > p.preview.ownedGroups.length && (
            <Text className='field-help'>
              그룹이 많아 일부만 표시해요. 정리 후 다시 확인해 주세요.
            </Text>
          )}
          <Button className='secondary-button' onClick={p.onRetry}>
            그룹 상태 다시 확인
          </Button>
        </Section>
      ) : p.preview?.canDelete ? (
        <Form
          className='stack-form account-deletion-form'
          onSubmit={p.onSubmit}
          aria-busy={p.pending}
        >
          <Text>
            그룹장인 그룹이 없어요. 아래 내용을 확인하고 탈퇴할 수 있어요.
          </Text>
          <Label>
            현재 비밀번호
            <Input
              name='currentPassword'
              type='password'
              autoComplete='current-password'
              required
              maxLength={128}
              disabled={p.pending}
            />
          </Label>
          <Label>
            확인 문구
            <Input
              name='confirmation'
              autoComplete='off'
              spellCheck={false}
              required
              pattern='탈퇴'
              title='탈퇴를 정확히 입력해 주세요.'
              aria-describedby='deletion-confirm-help'
              disabled={p.pending}
            />
          </Label>
          <Text id='deletion-confirm-help' className='field-help'>
            안내 내용을 확인했다면 ‘탈퇴’를 입력해 주세요. 아래 버튼을 누르면
            즉시 탈퇴하며 되돌릴 수 없어요.
          </Text>
          {p.error && (
            <Text role='alert' className='form-error'>
              {p.error}
            </Text>
          )}
          <Button
            type='submit'
            className='primary-button danger-button'
            disabled={p.pending}
          >
            {p.pending ? '계정을 정리하고 있어요…' : '회원 탈퇴하기'}
          </Button>
        </Form>
      ) : null}
      {!p.preview?.canDelete && p.error && (
        <Text role='alert' className='form-error'>
          {p.error}
        </Text>
      )}
      <Button className='text-button' onClick={p.onBack} disabled={p.pending}>
        계정 설정으로 돌아가기
      </Button>
    </Box>
  );
}
