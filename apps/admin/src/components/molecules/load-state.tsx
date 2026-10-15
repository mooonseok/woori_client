import { Box, Button, Subheading, Text } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
export function LoadingState({ message }: { message: string }) {
  return (
    <Text className='console-state' role='status'>
      {message}
    </Text>
  );
}
// A failed load keeps the real server message and offers a retry.
export function LoadError({
  title,
  message,
  retryLabel = '다시 시도',
  onRetry,
}: {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <Box className='console-state console-state-error' role='alert'>
      <Icon name='error' size={28} />
      <Subheading>{title}</Subheading>
      {message && <Text>{message}</Text>}
      {onRetry && (
        <Button className='secondary-button' onClick={onRetry}>
          <Icon name='refresh' size={18} />
          {retryLabel}
        </Button>
      )}
    </Box>
  );
}
