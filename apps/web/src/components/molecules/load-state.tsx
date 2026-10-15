import { Box, Button, Heading, Text } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
export function LoadingState({ message }: { message: string }) {
  return (
    <Text className='service-state' role='status'>
      {message}
    </Text>
  );
}
// A failed load keeps the real server message and offers retry and/or a way out.
export function LoadError({
  title,
  message,
  retryLabel = '다시 시도',
  onRetry,
  backLabel,
  onBack,
}: {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  backLabel?: string;
  onBack?: () => void;
}) {
  return (
    <Box className='service-state service-state-error'>
      <Icon name={onRetry ? 'error' : 'info'} size={32} />
      <Heading>{title}</Heading>
      {message && <Text role={onRetry ? 'alert' : undefined}>{message}</Text>}
      <Box className='inline-actions'>
        {onRetry && (
          <Button className='primary' onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        {onBack && backLabel && (
          <Button className='secondary-button' onClick={onBack}>
            {backLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}
