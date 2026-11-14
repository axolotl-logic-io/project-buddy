"use client";

import { type JSX, useCallback, useId, useRef, useState } from "react";
import {
  AddListItem,
  EditableList,
  EditableListAction,
  EditableListRow,
} from "@/components/ui/editable-list.tsx";
import type { EditorOptions } from "@/components/ui/editable-list-contract.ts";
import { Alert } from "@/components/ui/form-message.tsx";
import { parseTextList } from "@/components/ui/text-list-value.ts";
import { TEXT_LIST_COPY } from "@/ui/copy/text-list.ts";

interface TextRow {
  readonly id: string;
  readonly text: string;
}

function rowsFor(value: string, prefix: string): TextRow[] {
  return parseTextList(value).map((text, index) => ({
    id: `${prefix}-saved-${index}`,
    text,
  }));
}

function TextRowEditor({
  row,
  editor,
  removeAllowed,
  edit,
  remove,
}: {
  readonly row: TextRow;
  readonly editor: EditorOptions;
  readonly removeAllowed: boolean;
  readonly edit: (id: string, text: string) => Promise<boolean>;
  readonly remove: (id: string) => Promise<void>;
}): JSX.Element {
  const save = useCallback(
    (text: string): Promise<boolean> => edit(row.id, text),
    [edit, row.id],
  );
  const drop = useCallback(
    (): Promise<void> => remove(row.id),
    [remove, row.id],
  );
  return (
    <EditableListRow
      id={row.id}
      text={row.text}
      editor={editor}
      editLabel={TEXT_LIST_COPY.edit}
      actionsLabel={TEXT_LIST_COPY.actions(row.text)}
      onSave={save}
      disabled={false}
    >
      <EditableListAction
        icon="trash"
        onSelect={drop}
        disabled={!removeAllowed}
      >
        {TEXT_LIST_COPY.remove}
      </EditableListAction>
    </EditableListRow>
  );
}

// An editable list stored with the surrounding form. Row edits change its draft only.
function TextListField({
  name,
  label,
  hint,
  value,
  maxLength,
  maxItems,
  error,
  onChange,
}: {
  readonly name: string;
  readonly label: string;
  readonly hint: string;
  readonly value: string;
  readonly maxLength: number;
  readonly maxItems: number;
  readonly error?: string | undefined;
  readonly onChange: (name: string, value: string) => void;
}): JSX.Element {
  const legendRef = useRef<HTMLLegendElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [rows, setRows] = useState(() => rowsFor(value, listId));
  const [seen, setSeen] = useState(value);
  const rowCounterRef = useRef(0);
  if (seen !== value) {
    const next = rowsFor(value, listId);
    setSeen(value);
    setRows(next);
  }
  const commit = useCallback(
    (next: TextRow[]): void => {
      const encoded = JSON.stringify(next.map((row) => row.text));
      if (inputRef.current !== null) {
        inputRef.current.value = encoded;
      }
      setRows(next);
      setSeen(encoded);
      onChange(name, encoded);
    },
    [name, onChange],
  );
  const editor: EditorOptions = {
    label: TEXT_LIST_COPY.entry,
    save: TEXT_LIST_COPY.save,
    cancel: TEXT_LIST_COPY.cancel,
    placeholder: TEXT_LIST_COPY.entry,
    maxLength,
    validate: (text: string): { text: string } | { problem: string } => {
      const trimmed = text.trim();
      if (trimmed.length === 0 || trimmed.length > maxLength) {
        return { problem: TEXT_LIST_COPY.invalid(maxLength) };
      }
      return { text: trimmed };
    },
  };
  const add = useCallback(
    (text: string): Promise<boolean> => {
      if (rows.length >= maxItems) {
        return Promise.resolve(false);
      }
      const id = `${listId}-draft-${rowCounterRef.current}`;
      rowCounterRef.current += 1;
      commit([{ id, text }, ...rows]);
      return Promise.resolve(true);
    },
    [commit, rows, maxItems, listId],
  );
  const edit = useCallback(
    (id: string, text: string): Promise<boolean> => {
      commit(
        rows.map((row) => {
          if (row.id === id) {
            return { ...row, text };
          }
          return row;
        }),
      );
      return Promise.resolve(true);
    },
    [commit, rows],
  );
  const remove = useCallback(
    (id: string): Promise<void> => {
      if (rows.length > 1) {
        commit(rows.filter((row) => row.id !== id));
        queueMicrotask(() => legendRef.current?.focus());
      }
      return Promise.resolve();
    },
    [commit, rows],
  );
  const move = useCallback(
    (id: string, before: string | undefined): Promise<boolean> => {
      const moved = rows.find((row) => row.id === id);
      if (moved === undefined || id === before) {
        return Promise.resolve(false);
      }
      const rest = rows.filter((row) => row.id !== id);
      const index = rest.findIndex((row) => row.id === before);
      if (index < 0) {
        commit([...rest, moved]);
      } else {
        commit([...rest.slice(0, index), moved, ...rest.slice(index)]);
      }
      return Promise.resolve(true);
    },
    [commit, rows],
  );
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend ref={legendRef} tabIndex={-1} className="field-label">
        {label}
      </legend>
      <p className="field-hint">{hint}</p>
      <input ref={inputRef} type="hidden" name={name} value={value} />
      {error !== undefined && <Alert>{error}</Alert>}
      <AddListItem
        label={TEXT_LIST_COPY.add}
        editor={editor}
        disabled={rows.length >= maxItems}
        onSave={add}
      />
      <EditableList label={label} onMove={move}>
        {rows.map((row) => (
          <TextRowEditor
            key={row.id}
            row={row}
            editor={editor}
            removeAllowed={rows.length > 1}
            edit={edit}
            remove={remove}
          />
        ))}
      </EditableList>
    </fieldset>
  );
}

export { TextListField };
