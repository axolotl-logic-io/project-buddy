"use client";

import { DropdownMenu } from "radix-ui";
import {
  type ChangeEvent,
  createContext,
  type JSX,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type SubmitEvent,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { Alert } from "@/components/ui/form-message.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { EDITABLE_LIST_COPY } from "@/ui/copy/editable-list.ts";

interface SortContext {
  readonly dragging: string | undefined;
  readonly before: string | undefined;
  readonly start: (id: string) => void;
  readonly move: (x: number, y: number) => void;
  readonly drop: () => void;
  readonly cancel: () => void;
  readonly keyboard: (id: string, direction: "up" | "down") => void;
}
const SortContext = createContext<SortContext | undefined>(undefined);

// Reordering uses pointer events for mouse, pen and touch, with the same
// before-item operation for the handle's keyboard controls.
function EditableList({
  children,
  label,
  onMove,
}: {
  readonly children: ReactNode;
  readonly label: string;
  readonly onMove?:
    | ((id: string, before: string | undefined) => Promise<boolean>)
    | undefined;
}): JSX.Element {
  const listRef = useRef<HTMLUListElement>(null);
  const [dragging, setDragging] = useState<string | undefined>();
  const [before, setBefore] = useState<string | undefined>();
  const [announcement, setAnnouncement] = useState("");
  const targetRef = useRef<string | undefined>(undefined);
  const start = useCallback((id: string): void => {
    setDragging(id);
    targetRef.current = id;
    setBefore(id);
  }, []);
  const cancel = useCallback((): void => {
    setDragging(undefined);
    setBefore(undefined);
  }, []);
  const reorder = useCallback(
    (id: string, target: string | undefined): void => {
      if (onMove === undefined || id === target) {
        return;
      }
      setAnnouncement("");
      onMove(id, target)
        .then((saved) => {
          if (saved) {
            setAnnouncement(EDITABLE_LIST_COPY.reordered);
            queueMicrotask(() => {
              const row = Array.from(listRef.current?.children ?? []).find(
                (item) => item.getAttribute("data-list-item") === id,
              );
              row
                ?.querySelector<HTMLButtonElement>("[data-reorder-handle]")
                ?.focus();
            });
          }
        })
        .catch(() => setAnnouncement(EDITABLE_LIST_COPY.failed));
    },
    [onMove],
  );
  const move = useCallback(
    (x: number, y: number): void => {
      const list = listRef.current;
      if (list === null) {
        return;
      }
      const bounds = list.getBoundingClientRect();
      if (x < bounds.left || x > bounds.right) {
        targetRef.current = dragging;
        setBefore(dragging);
        return;
      }
      const rows = Array.from(list.children).filter(
        (row) => row instanceof HTMLElement,
      );
      const target = rows.find((row) => {
        const box = row.getBoundingClientRect();
        return y < box.top + box.height / 2;
      });
      const { listItem } = target?.dataset ?? {};
      targetRef.current = listItem;
      setBefore(targetRef.current);
    },
    [dragging],
  );
  const drop = useCallback((): void => {
    if (dragging !== undefined) {
      reorder(dragging, targetRef.current);
    }
    cancel();
  }, [cancel, dragging, reorder]);
  const keyboard = useCallback(
    (id: string, direction: "up" | "down"): void => {
      const rows = Array.from(listRef.current?.children ?? []);
      const index = rows.findIndex((row) => {
        if (!(row instanceof HTMLElement)) {
          return false;
        }
        const { listItem } = row.dataset;
        return listItem === id;
      });
      if (index < 0) {
        return;
      }
      let target: Element | undefined;
      if (direction === "up") {
        if (index === 0) {
          return;
        }
        target = rows[index - 1];
      } else {
        if (index === rows.length - 1) {
          return;
        }
        target = rows[index + 2];
      }
      let targetId: string | undefined;
      if (target instanceof HTMLElement) {
        const { listItem } = target.dataset;
        targetId = listItem;
      }
      reorder(id, targetId);
    },
    [reorder],
  );
  let context: SortContext | undefined;
  if (onMove !== undefined) {
    context = { dragging, before, start, move, drop, cancel, keyboard };
  }
  return (
    <SortContext.Provider value={context}>
      <ul
        ref={listRef}
        aria-label={label}
        className="editable-list"
        data-dragging={dragging !== undefined}
        data-drop-end={dragging !== undefined && before === undefined}
      >
        {children}
      </ul>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </SortContext.Provider>
  );
}

function TextEditor({
  initial,
  editor,
  disabled,
  onSave,
  onCancel,
}: {
  readonly initial: string;
  readonly editor: EditorOptions;
  readonly disabled: boolean;
  readonly onSave: (text: string) => Promise<boolean>;
  readonly onCancel: () => void;
}): JSX.Element {
  const inputId = useId();
  const problemId = useId();
  const [text, setText] = useState(initial);
  const [problem, setProblem] = useState<string | undefined>();
  const focus = useCallback((input: HTMLInputElement | null): void => {
    input?.focus();
    input?.select();
  }, []);
  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setText(event.currentTarget.value);
    setProblem(undefined);
  }, []);
  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    },
    [onCancel],
  );
  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const checked = editor.validate(text);
      if ("problem" in checked) {
        setProblem(checked.problem);
        return;
      }
      if (await onSave(checked.text)) {
        onCancel();
      }
    },
    [editor, onCancel, onSave, text],
  );
  let describedBy: string | undefined;
  if (problem !== undefined) {
    describedBy = problemId;
  }
  return (
    <form className="editable-form" onSubmit={submit}>
      <label className="sr-only" htmlFor={inputId}>
        {editor.label}
      </label>
      <input
        ref={focus}
        id={inputId}
        className="input-field"
        value={text}
        onChange={change}
        onKeyDown={keyDown}
        placeholder={editor.placeholder}
        aria-invalid={problem !== undefined}
        aria-describedby={describedBy}
        maxLength={editor.maxLength * 2}
        disabled={disabled}
      />
      <Button
        type="submit"
        variant="quiet"
        aria-label={editor.save}
        title={editor.save}
        disabled={disabled}
      >
        <Icon name="check" />
      </Button>
      <Button
        variant="quiet"
        onClick={onCancel}
        aria-label={editor.cancel}
        title={editor.cancel}
        disabled={disabled}
      >
        <Icon name="close" />
      </Button>
      {problem !== undefined && <Alert id={problemId}>{problem}</Alert>}
    </form>
  );
}

function EditableListRow({
  id,
  text,
  editor,
  editLabel,
  actionsLabel,
  menuLabel,
  disabled,
  onSave,
  children,
  checked,
  toggleLabel,
  onToggle,
}: {
  readonly id: string;
  readonly text: string;
  readonly editor: EditorOptions;
  readonly editLabel: string;
  readonly actionsLabel: string;
  readonly menuLabel?: string;
  readonly disabled: boolean;
  readonly onSave: (text: string) => Promise<boolean>;
  readonly children: ReactNode;
  readonly checked?: boolean;
  readonly toggleLabel?: string;
  readonly onToggle?: () => Promise<void>;
}): JSX.Element {
  const sort = useContext(SortContext);
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLButtonElement>(null);
  const startEditing = useCallback((): void => setEditing(true), []);
  const stopEditing = useCallback((): void => {
    setEditing(false);
    queueMicrotask(() => editRef.current?.focus());
  }, []);
  const pointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>): void => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      sort?.start(id);
    },
    [id, sort],
  );
  const pointerMove = useCallback(
    (event: PointerEvent<HTMLButtonElement>): void => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        sort?.move(event.clientX, event.clientY);
      }
    },
    [sort],
  );
  const pointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>): void => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        sort?.drop();
      }
    },
    [sort],
  );
  const cancelDrag = useCallback((): void => sort?.cancel(), [sort]);
  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        let direction: "up" | "down" = "up";
        if (event.key === "ArrowDown") {
          direction = "down";
        }
        sort?.keyboard(id, direction);
      } else if (event.key === "Escape") {
        sort?.cancel();
      }
    },
    [id, sort],
  );
  return (
    <li
      className="editable-row"
      data-list-item={id}
      data-completed={checked === true}
      data-dragging={sort?.dragging === id}
      data-drop-before={sort?.dragging !== undefined && sort.before === id}
    >
      {checked !== undefined && (
        <span className="editable-check">
          <input
            type="checkbox"
            checked={checked}
            aria-label={toggleLabel}
            onChange={onToggle}
            disabled={disabled}
          />
        </span>
      )}
      {editing === true && (
        <TextEditor
          initial={text}
          editor={editor}
          disabled={disabled}
          onSave={onSave}
          onCancel={stopEditing}
        />
      )}
      {editing === false && (
        <Button
          ref={editRef}
          variant="quiet"
          className="editable-text"
          aria-label={editLabel}
          onClick={startEditing}
          disabled={disabled || checked === true}
        >
          {text}
        </Button>
      )}
      <span className="editable-actions">
        {sort !== undefined && (
          <Button
            variant="quiet"
            className="editable-grip"
            data-reorder-handle={true}
            aria-label={EDITABLE_LIST_COPY.reorder(text)}
            title={EDITABLE_LIST_COPY.dragHint}
            disabled={disabled}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={cancelDrag}
            onKeyDown={keyDown}
          >
            <Icon name="grip" />
          </Button>
        )}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild={true}>
            <Button
              variant="quiet"
              className="editable-more"
              aria-label={actionsLabel}
              title={actionsLabel}
              disabled={disabled}
            >
              <Icon name="more" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="editable-menu" align="end">
            {menuLabel !== undefined && (
              <DropdownMenu.Label className="editable-menu-label">
                {menuLabel}
              </DropdownMenu.Label>
            )}
            {children}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </span>
    </li>
  );
}

function AddListItem({
  label,
  editor,
  disabled,
  onSave,
}: {
  readonly label: string;
  readonly editor: EditorOptions;
  readonly disabled: boolean;
  readonly onSave: (text: string) => Promise<boolean>;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const expand = useCallback((): void => setOpen(true), []);
  const collapse = useCallback((): void => {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);
  if (open === true) {
    return (
      <div className="editable-add-form">
        <Icon name="plus" />
        <TextEditor
          initial=""
          editor={editor}
          disabled={disabled}
          onSave={onSave}
          onCancel={collapse}
        />
      </div>
    );
  }
  return (
    <Button
      ref={triggerRef}
      variant="quiet"
      className="editable-add"
      onClick={expand}
      disabled={disabled}
    >
      <Icon name="plus" />
      {label}
    </Button>
  );
}

function EditableListAction({
  children,
  icon,
  onSelect,
  disabled = false,
  label,
}: {
  readonly children: ReactNode;
  readonly icon: "arrow-up" | "arrow-down" | "trash" | "checklist";
  readonly onSelect: () => Promise<void>;
  readonly disabled?: boolean;
  readonly label?: string;
}): JSX.Element {
  return (
    <DropdownMenu.Item
      className="editable-menu-item"
      onSelect={onSelect}
      disabled={disabled}
      aria-label={label}
    >
      <Icon name={icon} />
      {children}
    </DropdownMenu.Item>
  );
}

export { AddListItem, EditableList, EditableListAction, EditableListRow };
