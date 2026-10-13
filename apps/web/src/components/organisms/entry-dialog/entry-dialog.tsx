"use client";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  Form,
  Header,
  Heading,
  Button,
  Input,
  Label,
  Text,
} from "@/components/atoms/ui";
import { Icon } from "@/components/atoms/icon";
export function EntryDialog({
  title,
  label,
  onSubmit,
  onClose,
  initialValue = "",
  submitLabel = "만들기",
}: {
  title: string;
  label: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null),
    [value, setValue] = useState(initialValue);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    input.current?.focus();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <Dialog
      ref={ref}
      className="entry-dialog"
      aria-label={title}
      onCancel={onClose}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) {
            onSubmit(value);
            onClose();
          }
        }}
      >
        <Header className="dialog-header">
          <Heading>{title}</Heading>
          <Button className="icon-button" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </Button>
        </Header>
        <Label className="field-label" htmlFor="entry-name">
          {label}
        </Label>
        <Input
          ref={input}
          id="entry-name"
          autoFocus
          required
          maxLength={80}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={label}
          className="field"
        />
        <Text className="muted">
          미리보기에서 만든 내용은 새로고침하면 초기화돼요.
        </Text>
        <Button className="primary full" type="submit" disabled={!value.trim()}>
          {submitLabel}
        </Button>
      </Form>
    </Dialog>
  );
}
