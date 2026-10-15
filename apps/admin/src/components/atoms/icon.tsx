import type { SVGProps } from 'react';

// Same stroke icon set as the member web (subset for the console).
const paths: Record<string, string[]> = {
  home: ['m3 10 9-7 9 7', 'M5 9v12h5v-7h4v7h5V9'],
  user: ['M20 21v-2a7 7 0 0 0-14 0v2', 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
  users: [
    'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    'M2 21v-2a8 8 0 0 1 16 0v2',
    'M18 4a4 4 0 0 1 0 7M20 15a6 6 0 0 1 2 5',
  ],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  comment: ['M21 11a9 9 0 0 1-9 9H3l1.8-4A9 9 0 1 1 21 11Z'],
  flag: ['M5 21V4', 'M5 4h12l-2.5 4.5L17 13H5'],
  clock: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 6v6l4 2'],
  logout: ['M9 3H3v18h6', 'M9 12h12', 'm16 7 5 5-5 5'],
  shield: ['m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6Z', 'm8 12 3 3 5-6'],
  copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
  check: ['m5 12 4 4L19 6'],
  close: ['m6 6 12 12', 'M18 6 6 18'],
  info: ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', 'M12 11v6M12 7h.01'],
  error: ['m12 3 10 18H2Z', 'M12 9v5M12 17h.01'],
  refresh: ['M20 7V2l-3 3a8 8 0 1 0 3 12', 'M15 7h5'],
  'arrow-right': ['m12 5 7 7-7 7', 'M4 12h15'],
  'chevron-right': ['m9 5 7 7-7 7'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', 'm15 15 6 6'],
  album: ['M4 3h16v18H4z', 'M4 16l5-5 4 4 3-3 4 4', 'M15 7h.01'],
  eye: [
    'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  ],
  back: ['m12 5-7 7 7 7', 'M5 12h15'],
  plug: ['M9 2v6M15 2v6', 'M6 8h12v4a6 6 0 0 1-12 0Z', 'M12 18v4'],
};
export function Icon({
  name,
  size = 20,
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
      {(paths[name] ?? paths.info).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
