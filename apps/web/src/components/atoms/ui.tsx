import type { ComponentPropsWithRef } from 'react';

export function Box(props: ComponentPropsWithRef<'div'>) {
  return <div {...props} />;
}
export function Span(props: ComponentPropsWithRef<'span'>) {
  return <span {...props} />;
}
export function Section(props: ComponentPropsWithRef<'section'>) {
  return <section {...props} />;
}
export function Header(props: ComponentPropsWithRef<'header'>) {
  return <header {...props} />;
}
export function Footer(props: ComponentPropsWithRef<'footer'>) {
  return <footer {...props} />;
}
export function Nav(props: ComponentPropsWithRef<'nav'>) {
  return <nav {...props} />;
}
export function Main(props: ComponentPropsWithRef<'main'>) {
  return <main {...props} />;
}
export function Text(props: ComponentPropsWithRef<'p'>) {
  return <p {...props} />;
}
export function Heading(props: ComponentPropsWithRef<'h2'>) {
  return <h2 {...props} />;
}
export function Subheading(props: ComponentPropsWithRef<'h3'>) {
  return <h3 {...props} />;
}
export function Article(props: ComponentPropsWithRef<'article'>) {
  return <article {...props} />;
}
export function Time(props: ComponentPropsWithRef<'time'>) {
  return <time {...props} />;
}
export function Button({
  type = 'button',
  ...props
}: ComponentPropsWithRef<'button'>) {
  return <button type={type} {...props} />;
}
export function Input(props: ComponentPropsWithRef<'input'>) {
  return <input {...props} />;
}
export function Textarea(props: ComponentPropsWithRef<'textarea'>) {
  return <textarea {...props} />;
}
export function Select(props: ComponentPropsWithRef<'select'>) {
  return <select {...props} />;
}
export function Option(props: ComponentPropsWithRef<'option'>) {
  return <option {...props} />;
}
export function Image({ alt, ...props }: ComponentPropsWithRef<'img'>) {
  return <img alt={alt ?? ''} {...props} />;
}
export function Label(props: ComponentPropsWithRef<'label'>) {
  return <label {...props} />;
}
export function Dialog(props: ComponentPropsWithRef<'dialog'>) {
  return <dialog {...props} />;
}
export function Ul(props: ComponentPropsWithRef<'ul'>) {
  return <ul {...props} />;
}
export function Li(props: ComponentPropsWithRef<'li'>) {
  return <li {...props} />;
}
export function Form(props: ComponentPropsWithRef<'form'>) {
  return <form {...props} />;
}
export function Fieldset(props: ComponentPropsWithRef<'fieldset'>) {
  return <fieldset {...props} />;
}
export function Legend(props: ComponentPropsWithRef<'legend'>) {
  return <legend {...props} />;
}
export function Anchor(props: ComponentPropsWithRef<'a'>) {
  return <a {...props} />;
}
export function Details(props: ComponentPropsWithRef<'details'>) {
  return <details {...props} />;
}
export function Summary(props: ComponentPropsWithRef<'summary'>) {
  return <summary {...props} />;
}
