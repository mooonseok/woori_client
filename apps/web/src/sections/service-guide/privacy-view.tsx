import { Li, Section, Span, Subheading, Text, Ul } from '@/components/atoms/ui';
import { BackHeader } from '@/components/molecules/back-header';
import type { GuideRow, GuideTopic } from '@/dto/service-guide.dto';
interface Props {
  notice: string;
  topics: GuideTopic[];
  operatorHeading: string;
  operatorRows: GuideRow[];
  onBack: () => void;
}
export function PrivacyView({
  notice,
  topics,
  operatorHeading,
  operatorRows,
  onBack,
}: Props) {
  return (
    <Section className='service-page' aria-labelledby='privacy-title'>
      <BackHeader
        title='개인정보 안내'
        titleId='privacy-title'
        onBack={onBack}
      />
      <Text className='notice-panel'>{notice}</Text>
      {topics.map((topic) => (
        <Section
          key={topic.id}
          className='guide-topic-section'
          aria-labelledby={`privacy-${topic.id}`}
        >
          <Subheading id={`privacy-${topic.id}`}>{topic.title}</Subheading>
          <Ul className='guide-points'>
            {topic.points.map((point) => (
              <Li key={point}>{point}</Li>
            ))}
          </Ul>
        </Section>
      ))}
      <Section
        className='guide-topic-section'
        aria-labelledby='privacy-operator'
      >
        <Subheading id='privacy-operator'>{operatorHeading}</Subheading>
        <Ul className='guide-facts'>
          {operatorRows.map((row) => (
            <Li key={row.key}>
              <Span className='guide-fact-label'>{row.label}</Span>
              <Span className={row.pending ? 'muted' : undefined}>
                {row.value}
              </Span>
            </Li>
          ))}
        </Ul>
      </Section>
    </Section>
  );
}
