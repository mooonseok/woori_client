import type { ComponentProps } from 'react';
export function Main(props: ComponentProps<'main'>) {
  return <main {...props} />;
}
export function Text(props: ComponentProps<'p'>) {
  return <p {...props} />;
}
export function Heading(props: ComponentProps<'h1'>) {
  return <h1 {...props} />;
}
