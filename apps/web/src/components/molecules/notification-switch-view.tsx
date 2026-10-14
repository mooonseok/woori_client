import { Button, Span } from '../atoms/ui';
import type { NotificationSettingRow } from '../../dto/notification.dto';

interface Props {
  row: NotificationSettingRow;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}
export function NotificationSwitchView({
  row,
  checked,
  disabled,
  onChange,
}: Props) {
  return (
    <Button
      className='notification-setting-row'
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
    >
      <Span className='notification-setting-copy'>
        <Span>{row.label}</Span>
        <Span className='notification-description'>{row.description}</Span>
      </Span>
      <Span className='notification-switch-label'>{checked ? '켬' : '끔'}</Span>
      <Span
        className='notification-switch'
        data-checked={checked}
        aria-hidden='true'
      >
        <Span />
      </Span>
    </Button>
  );
}
