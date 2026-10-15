import {
  Box,
  Button,
  Label,
  Option,
  Section,
  Select,
  Text,
  Title,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { EmptyState } from '@/components/molecules/empty-state';
import { LoadError, LoadingState } from '@/components/molecules/load-state';
import { Notice } from '@/components/molecules/notice';
import { AuditLogTableView } from '@/components/organisms/audit-log-table/audit-log-table-view';
import type { AuditLogRowViewModel } from '@/dto/audit-log-view.dto';
interface Props {
  action: string;
  actionLabel: string;
  options: readonly { value: string; label: string }[];
  rows: AuditLogRowViewModel[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  moreError: string;
  notice: string;
  hasMore: boolean;
  onAction: (value: string) => void;
  onRetry: () => void;
  onMore: () => void;
}
export function AuditLogsView({
  action,
  actionLabel,
  options,
  rows,
  loading,
  loadingMore,
  error,
  moreError,
  notice,
  hasMore,
  onAction,
  onRetry,
  onMore,
}: Props) {
  return (
    <Section className='console-page' aria-labelledby='page-title'>
      <Box className='page-head'>
        <Title id='page-title'>감사로그</Title>
        <Text className='muted'>
          관리자 로그인·인증·계정 변경 기록이에요. 기록은 수정하거나 삭제할 수
          없어요. 시간은 한국 표준시(KST)예요.
        </Text>
      </Box>
      <Box className='toolbar'>
        <Box className='field field-inline'>
          <Label htmlFor='audit-action'>작업 종류</Label>
          <Select
            id='audit-action'
            value={action}
            onChange={(event) => onAction(event.target.value)}
          >
            <Option value=''>전체</Option>
            {options.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Box>
        <Button
          className='secondary-button'
          aria-disabled={loading}
          onClick={() => {
            if (!loading) onRetry();
          }}
        >
          <Icon name='refresh' size={18} />
          새로고침
        </Button>
      </Box>
      {loading ? (
        <LoadingState message='감사 기록을 불러오고 있어요…' />
      ) : error ? (
        <LoadError
          title='감사 기록을 불러오지 못했어요'
          message={error}
          onRetry={onRetry}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon='clock'
          title={
            action
              ? `‘${actionLabel}’ 기록이 없어요`
              : '아직 감사 기록이 없어요'
          }
          body={
            action
              ? '다른 작업 종류를 고르거나 전체 기록을 확인해 주세요.'
              : '관리자 로그인·인증·계정 변경이 생기면 여기에 표시돼요.'
          }
        />
      ) : (
        <>
          {notice && <Notice>{notice}</Notice>}
          <Text className='muted' role='status'>
            {rows.length}건 표시 중{hasMore ? ' · 더 있어요' : ''}
          </Text>
          <AuditLogTableView
            caption={action ? `감사 기록: ${actionLabel}` : '감사 기록 전체'}
            rows={rows}
          />
          {moreError && <Notice tone='error'>{moreError}</Notice>}
          {hasMore && (
            <Button
              className='secondary-button list-more'
              aria-disabled={loadingMore}
              aria-busy={loadingMore}
              onClick={onMore}
            >
              {loadingMore
                ? '불러오는 중…'
                : moreError
                  ? '다시 불러오기'
                  : '기록 더 보기'}
            </Button>
          )}
        </>
      )}
    </Section>
  );
}
