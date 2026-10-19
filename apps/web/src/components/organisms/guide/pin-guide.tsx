'use client';
import { useEffect, useRef } from 'react';
import type { Photo, Point } from '@/dto/album.dto';
import { Box, Button, Heading, Image, Span, Text } from '@/components/atoms/ui';

/** Kept inside the viewer's modal so the real photo remains selectable. */
export function PinGuide({
  step,
  photo,
  point,
  onNext,
  onPrevious,
  onClose,
}: {
  step: number;
  photo: Photo;
  point?: Point;
  onNext(): void;
  onPrevious(): void;
  onClose(): void;
}) {
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    next.current?.focus({ preventScroll: true });
    return () => {
      queueMicrotask(() => {
        if (previous?.isConnected && !previous.closest('[inert]'))
          previous.focus({ preventScroll: true });
        else
          document
            .querySelector<HTMLElement>('.woori-viewer .viewer-stage')
            ?.focus({ preventScroll: true });
      });
    };
  }, []);
  useEffect(() => {
    next.current?.focus({ preventScroll: true });
  }, [step]);
  return (
    <Box
      className='pin-guide'
      role='region'
      aria-labelledby='pin-guide-title'
      data-viewer-interactive='true'
    >
      <Box className='pin-guide-header'>
        <Text>위치 댓글 안내 · {step} / 3</Text>
        <Button onClick={onClose}>건너뛰기</Button>
      </Box>
      <Box className='pin-guide-progress' aria-hidden='true'>
        {[1, 2, 3].map((index) => (
          <Span key={index} className={index <= step ? 'is-active' : ''} />
        ))}
      </Box>
      <Box key={step} className='pin-guide-copy' aria-live='polite'>
        <Heading id='pin-guide-title'>
          {step === 1
            ? '이야기를 남길 곳을 골라요'
            : step === 2
              ? '선택한 자리에 한마디'
              : '핀을 눌러 다시 읽어요'}
        </Heading>
        <Text>
          {step === 1
            ? '사진에서 원하는 곳을 눌러 보세요. 확대해서 고를 수도 있어요.'
            : step === 2
              ? '이 위치에 댓글이 붙어요. 실제로 남길 때는 내용을 입력하고 등록하면 돼요.'
              : '사진 위의 핀을 누르면 그 자리에 남긴 이야기를 볼 수 있어요.'}
        </Text>
        {step > 1 && point && (
          <Box className='pin-guide-preview' aria-label='선택한 위치 미리보기'>
            <Image src={photo.src} alt='' />
            <Span
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
              aria-hidden='true'
            >
              1
            </Span>
          </Box>
        )}
        <Text className='pin-guide-note'>
          연습 중이에요. 댓글은 등록되지 않아요.
        </Text>
      </Box>
      <Box className='pin-guide-actions'>
        {step > 1 && <Button onClick={onPrevious}>이전</Button>}
        <Button ref={next} className='pin-guide-next' onClick={onNext}>
          {step === 1
            ? '가운데로 연습하기'
            : step === 3
              ? '안내 마치기'
              : '다음'}
        </Button>
      </Box>
    </Box>
  );
}
