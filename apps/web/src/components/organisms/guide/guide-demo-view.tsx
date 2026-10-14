import { Box, Image, Span, Text } from '@/components/atoms/ui';
interface Props {
  kind: 'view' | 'pin';
  step: number;
  phase: number;
}
export function GuideDemoView({ kind, step, phase }: Props) {
  const zoomed = kind === 'view' && step === 1 && phase === 2;
  const next = kind === 'view' && step === 2 && phase >= 2;
  const pin = kind === 'pin' && (step > 0 || phase >= 2);
  return (
    <Box
      className={`guide-demo guide-demo--${kind}-${step} phase-${phase}`}
      aria-hidden='true'
    >
      <Box
        className='guide-demo-photo'
        style={{ transform: zoomed ? 'scale(1.8)' : 'scale(1)' }}
      >
        <Image
          src={next ? '/demo/photos/p289.jpg' : '/demo/photos/p129.jpg'}
          alt=''
          draggable={false}
        />
        {pin && <Span className='guide-demo-pin'>1</Span>}
      </Box>
      {kind === 'view' && step === 0 && (
        <Box className={`guide-demo-bars ${phase === 2 ? 'is-hidden' : ''}`}>
          <Span>×</Span>
          <Span>1 / 3</Span>
          <Span>···</Span>
        </Box>
      )}
      {kind === 'view' && step === 1 && phase > 0 && (
        <>
          <Span
            className={`guide-finger guide-finger--left ${zoomed ? 'is-spread' : ''}`}
          />
          <Span
            className={`guide-finger guide-finger--right ${zoomed ? 'is-spread' : ''}`}
          />
        </>
      )}
      {kind === 'view' && step !== 1 && phase === 1 && (
        <Span
          className={`guide-finger ${step === 2 ? 'guide-finger--swipe' : ''}`}
        />
      )}
      {kind === 'pin' && step === 0 && phase === 1 && (
        <Span className='guide-finger guide-finger--pin' />
      )}
      {kind === 'pin' && step === 1 && phase > 0 && (
        <Box className='guide-demo-composer'>
          <Text>
            {phase >= 2 ? '함께여서 더 좋았던 날' : '한마디를 남겨 주세요'}
          </Text>
          <Span>{phase >= 3 ? '등록됐어요' : '등록'}</Span>
        </Box>
      )}
      {kind === 'pin' && step === 2 && phase >= 2 && (
        <Box className='guide-demo-bubble'>
          <Text>엄마</Text>
          <Text>함께여서 더 좋았던 날</Text>
        </Box>
      )}
      {kind === 'view' && step === 2 && (
        <Span className='guide-demo-counter'>{next ? '2' : '1'} / 3</Span>
      )}
    </Box>
  );
}
