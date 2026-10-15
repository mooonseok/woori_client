import {
  Box,
  Button,
  Li,
  Section,
  Span,
  Subheading,
  Text,
  Ul,
} from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';
import { Link } from '@/components/molecules/link';
import { BackHeader } from '@/components/molecules/back-header';
import { Guide } from '@/components/organisms/guide/guide';
import type { GuideTopic } from '@/dto/service-guide.dto';
interface Props {
  topics: GuideTopic[];
  guide: 'view' | 'pin' | null;
  inquiryHref: string;
  onGuide: (kind: 'view' | 'pin' | null) => void;
  onBack: () => void;
}
export function HelpView({
  topics,
  guide,
  inquiryHref,
  onGuide,
  onBack,
}: Props) {
  return (
    <Section className='service-page' aria-labelledby='help-title'>
      <BackHeader title='도움말' titleId='help-title' onBack={onBack} />
      {topics.map((topic) => (
        <Section
          key={topic.id}
          className='guide-topic-section'
          aria-labelledby={`help-${topic.id}`}
        >
          <Subheading id={`help-${topic.id}`}>{topic.title}</Subheading>
          <Ul className='guide-points'>
            {topic.points.map((point) => (
              <Li key={point}>{point}</Li>
            ))}
          </Ul>
        </Section>
      ))}
      <Section
        className='guide-topic-section'
        aria-labelledby='help-walkthrough'
      >
        <Subheading id='help-walkthrough'>사용법 다시 보기</Subheading>
        <Box>
          <Button className='menu-row' onClick={() => onGuide('view')}>
            <Icon name='photo' />
            <Span>사진 감상</Span>
            <Icon name='chevron-right' />
          </Button>
          <Button className='menu-row' onClick={() => onGuide('pin')}>
            <Icon name='pin' />
            <Span>위치 댓글</Span>
            <Icon name='chevron-right' />
          </Button>
        </Box>
      </Section>
      {inquiryHref && (
        <Box className='notice-panel'>
          <Text>원하는 답을 찾지 못했다면 문의를 남겨 주세요.</Text>
          <Link className='secondary-button' href={inquiryHref}>
            문의하기
          </Link>
        </Box>
      )}
      {guide && <Guide kind={guide} onClose={() => onGuide(null)} />}
    </Section>
  );
}
