import type { CSSProperties } from 'react';
import { Span } from '@/components/atoms/ui';
import { ReactionIcon } from '@/components/atoms/reaction-icon';
import { REACTION_OPTIONS } from '@/constants/reactions';
export function ReactionFan({
  reactions,
  mine,
}: {
  reactions: { emoji: string; count: number }[];
  mine?: string | null;
}) {
  const active = REACTION_OPTIONS.filter((option) =>
    reactions.some((r) => r.emoji === option.emoji && r.count > 0)
  );
  return (
    <Span
      className='reaction-fan'
      aria-hidden='true'
      style={{ width: active.length ? 30 + (active.length - 1) * 21 : 26 }}
    >
      {active.length ? (
        active.map((item, index) => (
          <Span
            key={item.emoji}
            className={`reaction-leaf${mine === item.emoji ? ' is-mine' : ''}`}
            style={
              {
                '--fan-x': `${index * 21}px`,
                '--fan-angle': `${(index - (active.length - 1) / 2) * 9}deg`,
                zIndex: index + 1,
              } as CSSProperties
            }
          >
            <ReactionIcon emoji={item.emoji} size={18} />
          </Span>
        ))
      ) : (
        <ReactionIcon emoji='❤️' />
      )}
    </Span>
  );
}
