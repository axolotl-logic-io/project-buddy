"use client";

import { Dialog } from "radix-ui";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type JSX,
  type KeyboardEvent,
  type SubmitEvent,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import type {
  EditorOptions,
  SplitOptions,
} from "@/components/ui/editable-list-contract.ts";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";

const LINE_BREAK = /\r?\n/u;

// The fewest parts a split makes: fewer would only be an edit.
const FEWEST_PARTS = 2;

interface Part {
  readonly key: number;
  readonly text: string;
  readonly problem?: string | undefined;
}

// What the open dialog needs to know about the list item and its list.
interface SplitSubject {
  readonly text: string;
  readonly editor: EditorOptions;
  readonly split: SplitOptions;
}

// One part's number, field, problem and, beyond the first two, its remove
// button.
function SplitPart({
  part,
  number,
  editor,
  copy,
  removable,
  disabled,
  onChange,
  onPaste,
  onRemove,
}: {
  readonly part: Part;
  readonly number: number;
  readonly editor: EditorOptions;
  readonly copy: SplitOptions["copy"];
  readonly removable: boolean;
  readonly disabled: boolean;
  readonly onChange: (key: number, text: string) => void;
  readonly onPaste: (key: number, lines: readonly string[]) => void;
  readonly onRemove: (key: number) => void;
}): JSX.Element {
  const inputId = useId();
  const problemId = useId();
  const { key } = part;
  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void =>
      onChange(key, event.currentTarget.value),
    [key, onChange],
  );
  const paste = useCallback(
    (event: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (editor.multiline === true) {
        return;
      }
      const lines = event.clipboardData
        .getData("text/plain")
        .split(LINE_BREAK)
        .map((line) => line.trim())
        .filter((line) => line !== "");
      if (lines.length < 2) {
        return;
      }
      event.preventDefault();
      onPaste(key, lines);
    },
    [editor.multiline, key, onPaste],
  );
  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (
        event.key === "Enter" &&
        (event.metaKey || event.ctrlKey) &&
        editor.multiline === true
      ) {
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }
    },
    [editor.multiline],
  );
  const remove = useCallback((): void => onRemove(key), [key, onRemove]);
  let describedBy: string | undefined;
  if (part.problem !== undefined) {
    describedBy = problemId;
  }
  let Field: "input" | "textarea" = "input";
  if (editor.multiline === true) {
    Field = "textarea";
  }
  return (
    <li className="split-part">
      <span className="split-part-number" aria-hidden="true">
        <span className="split-part-seal">{number}</span>
      </span>
      <label className="sr-only" htmlFor={inputId}>
        {copy.part(number)}
      </label>
      <Field
        id={inputId}
        data-part={key}
        className="input-field"
        value={part.text}
        onChange={change}
        onPaste={paste}
        onKeyDown={keyDown}
        aria-invalid={part.problem !== undefined}
        aria-describedby={describedBy}
        maxLength={editor.maxLength * 2}
        autoComplete="off"
        disabled={disabled}
      />
      {removable === true && (
        <Button
          variant="quiet"
          className="split-part-remove"
          aria-label={copy.removePart(number)}
          title={copy.removePart(number)}
          onClick={remove}
          disabled={disabled}
        >
          <Icon name="close" />
        </Button>
      )}
      {part.problem !== undefined && (
        <Alert id={problemId}>{part.problem}</Alert>
      )}
    </li>
  );
}

// The dialog's content: the list item, its parts and the form's buttons.
// It mounts each time the dialog opens, so every split starts afresh.
function SplitForm({
  subject: { text, editor, split },
  onDone,
}: {
  readonly subject: SplitSubject;
  readonly onDone: () => void;
}): JSX.Element {
  const { copy, maxParts, onSplit } = split;
  const nextKeyRef = useRef(FEWEST_PARTS);
  const focusRef = useRef<number | undefined>(undefined);
  const [parts, setParts] = useState<readonly Part[]>(() =>
    Array.from({ length: FEWEST_PARTS }, (_, key) => ({ key, text: "" })),
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // A part added, removed, pasted into or found wrong takes focus.
  useLayoutEffect(() => {
    const key = focusRef.current;
    if (parts.length === 0 || key === undefined) {
      return;
    }
    focusRef.current = undefined;
    formRef.current
      ?.querySelector<HTMLElement>(`[data-part="${key}"]`)
      ?.focus();
  }, [parts]);
  const fresh = useCallback((partText: string): Part => {
    const key = nextKeyRef.current;
    nextKeyRef.current += 1;
    return { key, text: partText };
  }, []);
  const change = useCallback((key: number, partText: string): void => {
    setFailed(false);
    setParts((current) =>
      current.map((part) => {
        if (part.key !== key) {
          return part;
        }
        return { key, text: partText };
      }),
    );
  }, []);
  // The first line goes in the part pasted into; each other line becomes a
  // part after it, in place of the empty parts that followed it.
  const paste = useCallback(
    (key: number, lines: readonly string[]): void => {
      const index = parts.findIndex((part) => part.key === key);
      const [first = "", ...rest] = lines;
      const added = rest.map(fresh);
      const next = [
        ...parts.slice(0, index),
        { key, text: first },
        ...added,
        ...parts.slice(index + 1).filter((part) => part.text !== ""),
      ];
      while (next.length < FEWEST_PARTS) {
        next.push(fresh(""));
      }
      const kept = next.slice(0, maxParts);
      // The last pasted line takes focus, or the last part if it was cut.
      focusRef.current =
        kept[Math.min(index + added.length, kept.length - 1)]?.key;
      setFailed(false);
      setParts(kept);
    },
    [fresh, maxParts, parts],
  );
  const add = useCallback((): void => {
    const part = fresh("");
    focusRef.current = part.key;
    setParts((current) => [...current, part].slice(0, maxParts));
  }, [fresh, maxParts]);
  const remove = useCallback(
    (key: number): void => {
      const index = parts.findIndex((part) => part.key === key);
      focusRef.current = parts[Math.max(index - 1, 0)]?.key;
      setParts(parts.filter((part) => part.key !== key));
    },
    [parts],
  );
  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (saving === true) {
        return;
      }
      const checked = parts.map((part) => ({
        part,
        checked: editor.validate(part.text),
      }));
      const texts = checked.flatMap(({ checked: result }) => {
        if ("problem" in result) {
          return [];
        }
        return [result.text];
      });
      if (texts.length < parts.length) {
        setParts(
          checked.map(({ part, checked: result }) => {
            if ("problem" in result) {
              return { ...part, problem: result.problem };
            }
            return part;
          }),
        );
        const invalid = checked.find(
          ({ checked: result }) => "problem" in result,
        );
        focusRef.current = invalid?.part.key;
        return;
      }
      setSaving(true);
      setFailed(false);
      let saved = false;
      try {
        saved = await onSplit(texts);
      } catch {
        saved = false;
      }
      if (saved) {
        onDone();
        return;
      }
      setSaving(false);
      setFailed(true);
    },
    [editor, onDone, onSplit, parts, saving],
  );
  let hint: JSX.Element | undefined;
  if (editor.multiline !== true) {
    hint = <p className="field-hint">{copy.pasteHint}</p>;
  }
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Dialog.Title className="section-heading">{copy.title}</Dialog.Title>
        <Dialog.Close asChild={true}>
          <Button
            aria-label={copy.close}
            className="min-w-(--target-size)"
            variant="secondary"
          >
            <Icon name="close" />
          </Button>
        </Dialog.Close>
      </div>
      <Dialog.Description className="text-muted">
        {copy.description}
      </Dialog.Description>
      <figure className="split-original">
        <figcaption className="split-label">{copy.original}</figcaption>
        <blockquote className="split-original-text">{text}</blockquote>
      </figure>
      <form
        ref={formRef}
        className="split-form"
        onSubmit={submit}
        noValidate={true}
      >
        <fieldset className="split-parts">
          <legend className="split-label">{copy.parts}</legend>
          {hint}
          <ol className="split-part-list">
            {parts.map((part, index) => (
              <SplitPart
                key={part.key}
                part={part}
                number={index + 1}
                editor={editor}
                copy={copy}
                removable={parts.length > FEWEST_PARTS}
                disabled={saving}
                onChange={change}
                onPaste={paste}
                onRemove={remove}
              />
            ))}
          </ol>
          {parts.length < maxParts && (
            <Button
              variant="quiet"
              className="split-add"
              onClick={add}
              disabled={saving}
            >
              <Icon name="plus" />
              {copy.addPart}
            </Button>
          )}
        </fieldset>
        {failed === true && <Alert>{copy.failed}</Alert>}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <Dialog.Close asChild={true}>
            <Button variant="secondary">{copy.cancel}</Button>
          </Dialog.Close>
          <Button type="submit" aria-busy={saving} disabled={saving}>
            <Icon name="split" />
            {copy.submit(parts.length)}
          </Button>
        </div>
      </form>
    </>
  );
}

// A modal dialog that replaces a list item with the parts the user writes.
// It shows the item's text and starts with two empty parts; the user can add
// parts up to the split's most and remove any beyond two. Pasting several
// lines into a one-line part makes a part of each line. Every part must
// pass the editor's check before onSplit runs; a failed split keeps the
// dialog open with the parts as written. Escape, Cancel, the close button
// or a click beside it closes it without a change. The first part takes
// focus when it opens. Closing it calls
// onCloseAutoFocus, where the opener returns focus, since a menu item that
// opens it is gone by then.
function SplitDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
  ...subject
}: SplitSubject & {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCloseAutoFocus: (event: Event) => void;
}): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const done = useCallback((): void => onOpenChange(false), [onOpenChange]);
  // The first part takes focus, ready to write in.
  const focusFirstPart = useCallback((event: Event): void => {
    event.preventDefault();
    contentRef.current?.querySelector<HTMLElement>("[data-part]")?.focus();
  }, []);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          ref={contentRef}
          className="dialog-panel split-dialog"
          onOpenAutoFocus={focusFirstPart}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <SplitForm subject={subject} onDone={done} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { SplitDialog };
