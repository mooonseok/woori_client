import type { SVGProps } from 'react';

const paths: Record<string, string[]> = {
  home: ['m3 10 9-7 9 7', 'M5 9v12h5v-7h4v7h5V9'],
  album: ['M4 3h16v18H4z', 'M4 16l5-5 4 4 3-3 4 4', 'M15 7h.01'],
  photo: ['M3 3h18v18H3z', 'm3 16 6-6 4 4 3-3 5 5', 'M16 7h.01'],
  user: ['M20 21v-2a7 7 0 0 0-14 0v2', 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
  search: ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', 'm15 15 6 6'],
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  back: ['m12 5-7 7 7 7', 'M5 12h15'],
  'arrow-right': ['m12 5 7 7-7 7', 'M4 12h15'],
  'chevron-left': ['m15 5-7 7 7 7'],
  'chevron-right': ['m9 5 7 7-7 7'],
  'chevron-down': ['m5 9 7 7 7-7'],
  check: ['m5 12 4 4L19 6'],
  heart: [
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  ],
  comment: ['M21 11a9 9 0 0 1-9 9H3l1.8-4A9 9 0 1 1 21 11Z'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  settings: [
    'm9 3-1 3-3 1 1 4-2 2 2 3 3 1 1 4h4l1-4 3-1 2-3-2-2 1-4-3-1-1-3Z',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  ],
  more: ['M5 12h.01M12 12h.01M19 12h.01'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 16v5h16v-5'],
  upload: ['M12 16V4', 'm7 9 5-5 5 5', 'M4 16v5h16v-5'],
  pin: [
    'M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 1 1 14 0Z',
    'M14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  ],
  'zoom-in': [
    'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    'm15 15 6 6',
    'M7 10h6M10 7v6',
  ],
  'zoom-out': ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', 'm15 15 6 6', 'M7 10h6'],
  info: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 11v6M12 7h.01'],
  help: [
    'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    'M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01',
  ],
  logout: ['M9 3H3v18h6', 'M9 12h12', 'm16 7 5 5-5 5'],
  users: [
    'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    'M2 21v-2a8 8 0 0 1 16 0v2',
    'M18 4a4 4 0 0 1 0 7M20 15a6 6 0 0 1 2 5',
  ],
  share: ['M12 15V2', 'm7 7 5-5 5 5', 'M5 11v11h14V11'],
  eye: [
    'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  ],
  'eye-off': [
    'm3 3 18 18',
    'M9 5c7-2 13 7 13 7s-1 3-4 5M6 6c-2 2-4 6-4 6s4 7 10 7c1 0 3 0 4-1',
  ],
  refresh: ['M20 7V2l-3 3a8 8 0 1 0 3 12', 'M15 7h5'],
  clock: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 6v6l4 2'],
  shield: ['m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6Z', 'm8 12 3 3 5-6'],
  'check-all': ['m2 12 4 4L16 6', 'm12 16 10-10'],
  error: ['m12 3 10 18H2Z', 'M12 9v5M12 17h.01'],
  flag: ['M5 21V4', 'M5 4h12l-2.5 4.5L17 13H5'],
};
const aliases: Record<string, string> = {
  albums: 'album',
  image: 'photo',
  person: 'user',
  'arrow-left': 'back',
  arrow_back: 'back',
  arrow_forward: 'arrow-right',
  expand_more: 'chevron-down',
  chevron_left: 'chevron-left',
  chevron_right: 'chevron-right',
  notifications: 'bell',
  add: 'plus',
  add_photo_alternate: 'upload',
  more_horiz: 'more',
  chat_bubble: 'comment',
  'message-circle': 'comment',
  add_location_alt: 'pin',
  location_on: 'pin',
  location: 'pin',
  favorite: 'heart',
  zoom_in: 'zoom-in',
  zoom_out: 'zoom-out',
  replay: 'refresh',
  history: 'clock',
  person_add: 'users',
  check_circle: 'check',
  done_all: 'check-all',
  tune: 'settings',
  photo_album: 'album',
  visibility: 'eye',
  visibility_off: 'eye-off',
  lock: 'shield',
  warning: 'error',
};
export function Icon({
  name,
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.7}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      focusable='false'
      {...props}
    >
      {(paths[aliases[name] ?? name] ?? paths.info).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
