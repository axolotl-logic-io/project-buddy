"use client";

import {
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Icon } from "@/components/ui/icon.tsx";
import { FINDER_COPY } from "@/ui/copy/finder.ts";

// Whether a key press is meant for the control it lands in.
function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

// "/" anywhere but a field focuses the search.
function focusOnSlash(
  fieldRef: RefObject<HTMLInputElement | null>,
  event: globalThis.KeyboardEvent,
): void {
  if (
    event.key !== FINDER_COPY.searchKey ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    typing(event.target)
  ) {
    return;
  }
  event.preventDefault();
  fieldRef.current?.focus();
}

// A finder's search, as on Quests and the Grimoire: "/" reaches it from
// anywhere but a field, Escape empties it, and Clear does once it holds a
// search.
function FinderSearch({
  label,
  placeholder,
  value,
  onValueChange,
}: {
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
}): JSX.Element {
  const fieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent): void {
      focusOnSlash(fieldRef, event);
    }
    document.addEventListener("keydown", onKey);
    return (): void => document.removeEventListener("keydown", onKey);
  }, []);
  const type = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onValueChange(event.currentTarget.value);
    },
    [onValueChange],
  );
  const clear = useCallback((): void => {
    onValueChange("");
    fieldRef.current?.focus();
  }, [onValueChange]);
  const clearOnEscape = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape" && event.currentTarget.value !== "") {
        event.preventDefault();
        onValueChange("");
      }
    },
    [onValueChange],
  );
  return (
    <search className="quest-finder-search">
      <Icon name="search" />
      <input
        aria-label={label}
        aria-keyshortcuts={FINDER_COPY.searchKey}
        autoComplete="off"
        onChange={type}
        onKeyDown={clearOnEscape}
        placeholder={placeholder}
        ref={fieldRef}
        type="search"
        value={value}
      />
      {value === "" && <kbd>{FINDER_COPY.searchKey}</kbd>}
      {value !== "" && (
        <button
          aria-label={FINDER_COPY.clear}
          className="quest-finder-clear"
          onClick={clear}
          type="button"
        >
          <Icon name="close" />
        </button>
      )}
    </search>
  );
}

export { FinderSearch };
