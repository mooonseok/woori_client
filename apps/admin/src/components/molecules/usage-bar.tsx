import { Box, Span } from '@/components/atoms/ui';
// Storage use: the text carries the meaning; the bar is decoration.
export function UsageBar({
  label,
  percent,
  percentLabel,
}: {
  label: string;
  percent: number;
  percentLabel: string;
}) {
  return (
    <Box className='usage'>
      <Span>
        {label}
        {percentLabel && <Span className='muted'> ({percentLabel})</Span>}
      </Span>
      <Box className='usage-track' aria-hidden='true'>
        <Box
          className='usage-fill'
          data-high={percent >= 90 ? 'true' : undefined}
          style={{ width: `${percent}%` }}
        />
      </Box>
    </Box>
  );
}
