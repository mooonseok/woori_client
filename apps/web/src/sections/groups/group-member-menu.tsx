'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Button } from '@/components/atoms/ui';
import { Icon } from '@/components/atoms/icon';

export interface MemberMenuItem {
  label: string;
  danger?: boolean;
  onSelect: () => void;
}

// Per-row "더보기" menu of the roster. Choosing an item moves focus back to
// the trigger before the menu closes, so a dialog opened from it returns
// focus to this row (the trigger keeps the id used as the focus fallback).
export function GroupMemberMenu({
  id,
  label,
  disabled,
  items,
}: {
  id: string;
  label: string;
  disabled: boolean;
  items: MemberMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function choose(item: MemberMenuItem) {
    trigger.current?.focus();
    setOpen(false);
    item.onSelect();
  }
  return (
    <Box
      ref={root}
      className='member-menu'
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <Button
        ref={trigger}
        id={id}
        className='icon-button'
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <Icon name='more' />
      </Button>
      {open && (
        <Box className='member-menu-items' role='group' aria-label={label}>
          {items.map((item) => (
            <Button
              key={item.label}
              className={
                item.danger
                  ? 'member-menu-item danger-text'
                  : 'member-menu-item'
              }
              disabled={disabled}
              onClick={() => choose(item)}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );
}
