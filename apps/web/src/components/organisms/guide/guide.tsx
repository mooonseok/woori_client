'use client';
import { useEffect, useRef, useState } from 'react';
import type { GuideProps } from '@/dto/viewer.dto';
import {
  Box,
  Button,
  Dialog,
  Footer,
  Header,
  Heading,
  Span,
  Text,
} from '@/components/atoms/ui';
import { useGuideTimeline } from '@/hooks/use-guide-timeline';
import { GuideDemoView } from './guide-demo-view';
export function Guide({ kind, onClose }: GuideProps) {
  const dialog = useRef<HTMLDialogElement>(null),
    next = useRef<HTMLButtonElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);
  const timeline = useGuideTimeline(kind);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    next.current?.focus({ preventScroll: true });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  const close = () => {
    if (closing) return;
    setClosing(true);
    timer.current = setTimeout(onClose, timeline.reduced ? 0 : 180);
  };
  const move = (direction: number) => {
    const step = timeline.step + direction;
    if (step > 2) {
      close();
      return;
    }
    timeline.setStep(Math.max(0, step));
    next.current?.focus({ preventScroll: true });
  };
  return (
    <Dialog
      ref={dialog}
      className={`woori-guide ${closing ? 'is-closing' : ''}`}
      aria-labelledby='photo-guide-title'
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
    >
      <Box className='guide-shell'>
        <Header className='guide-header'>
          <Text>
            {kind === 'view' ? '사진 감상 사용법' : '위치 댓글 사용법'} ·{' '}
            {timeline.step + 1} / 3
          </Text>
          <Button onClick={close}>
            {timeline.step === 2 ? '닫기' : '건너뛰기'}
          </Button>
        </Header>
        <Box className='guide-progress' aria-hidden='true'>
          {[0, 1, 2].map((index) => (
            <Span
              key={index}
              className={index <= timeline.step ? 'is-active' : ''}
            />
          ))}
        </Box>
        <Box key={timeline.step} className='guide-content'>
          <Box
            className={`guide-demo-wrap ${timeline.reduced ? 'guide-demo-wrap--static' : ''}`}
          >
            {timeline.reduced ? (
              [0, 1, 3].map((phase, index) => (
                <Box key={phase}>
                  <GuideDemoView
                    kind={kind}
                    step={timeline.step}
                    phase={phase}
                  />
                  <Text className='guide-frame-label'>{index + 1}</Text>
                </Box>
              ))
            ) : (
              <GuideDemoView
                kind={kind}
                step={timeline.step}
                phase={timeline.phase}
              />
            )}
          </Box>
          <Box className='guide-copy' aria-live='polite'>
            <Heading id='photo-guide-title'>{timeline.content.title}</Heading>
            <Text>{timeline.content.body}</Text>
            <Text className='guide-note'>{timeline.content.note}</Text>
          </Box>
        </Box>
        <Footer className='guide-footer'>
          <Button
            onClick={() => move(-1)}
            disabled={closing}
            style={{ visibility: timeline.step ? 'visible' : 'hidden' }}
          >
            이전
          </Button>
          <Button
            onClick={timeline.replay}
            disabled={closing}
            className='guide-replay'
          >
            다시 보기
          </Button>
          <Button
            ref={next}
            onClick={() => move(1)}
            disabled={closing}
            className='guide-next'
          >
            {timeline.step === 2 ? '완료' : '다음'}
          </Button>
        </Footer>
      </Box>
    </Dialog>
  );
}
