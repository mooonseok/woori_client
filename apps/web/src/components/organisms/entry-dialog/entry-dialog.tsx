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
  maxLength = 80,
  note = "미리보기에서 만든 내용은 새로고침하면 초기화돼요.",
}: {
  title: string;
  label: string;
  initialValue?: string;
  submitLabel?: string;
  note?: string;
  maxLength?: number;
  onSubmit: (value: string) => unknown | Promise<unknown>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null),
    [value, setValue] = useState(initialValue),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <Form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!value.trim() || busy) return;
          setBusy(true);
          setError("");
          try {
            await onSubmit(value);
            onClose();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "저장하지 못했어요. 다시 시도해 주세요.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Header className="dialog-header">
          <Heading>{title}</Heading>
          <Button
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="닫기"
          >
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
          maxLength={maxLength}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={label}
          className="field"
        />
        {note && <Text className="muted">{note}</Text>}
        {error && (
          <Text role="alert" className="error-notice">
            {error}
          </Text>
        )}
        <Button
          className="primary full"
          type="submit"
          disabled={busy || !value.trim()}
        >
          {busy ? "저장 중…" : submitLabel}
        </Button>
      </Form>
    </Dialog>
  );
}
