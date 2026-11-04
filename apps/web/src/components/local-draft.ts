// What the viewer has typed but not yet sent or saved, such as a chat
// message or an edit to a buddy's prompt, kept in this browser's local
// storage under a key of its own, so that leaving the page, reloading or
// closing the tab doesn't lose it. A draft stays in this browser: the server
// never sees it. Without storage, as when the browser blocks it, nothing is
// kept and no draft is found, and the page works as before.
import { useState, useSyncExternalStore } from "react";
import type { z } from "zod";

// Keeps these keys apart from the browser's other uses of the storage.
const KEY_PREFIX = "draft:";

// The browser's local storage, or null if it blocks it.
function storageOrNull(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

// The text stored under key, or null if there is none or no storage.
function storedText(key: string): string | null {
  try {
    return storageOrNull()?.getItem(`${KEY_PREFIX}${key}`) ?? null;
  } catch {
    return null;
  }
}

// The draft in stored text, or undefined if there is none, or none that
// draft parses, as after a change of its shape.
function parseDraft<Draft>(
  stored: string | null,
  draft: z.ZodType<Draft>,
): Draft | undefined {
  if (stored === null) {
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(stored);
    const parsed = draft.safeParse(value);
    if (!parsed.success) {
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

// The draft kept under key, or undefined if there is none.
function readLocalDraft<Draft>(
  key: string,
  draft: z.ZodType<Draft>,
): Draft | undefined {
  return parseDraft(storedText(key), draft);
}

// The page is told of no change to the storage: a component reads its kept
// draft once, as the page opens, and holds its own draft after that.
function subscribeToNothing(): () => void {
  return () => undefined;
}

// What a page rendered on the server, with no storage, finds: no text yet.
const SERVER_TEXT = undefined;

function serverText(): typeof SERVER_TEXT {
  return SERVER_TEXT;
}

// What a component found kept under key as it opened: read is false while
// the page is rendered on the server or hydrating, where there is no
// storage, and true from the browser's first render, with kept the draft
// found then, if any. Drafts kept later don't change it.
function useKeptDraft<Draft>(
  key: string,
  draft: z.ZodType<Draft>,
): { readonly read: boolean; readonly kept: Draft | undefined } {
  const stored = useSyncExternalStore(
    subscribeToNothing,
    () => storedText(key),
    serverText,
  );
  const [first, setFirst] = useState<string | null | undefined>(undefined);
  if (first === undefined && stored !== undefined) {
    setFirst(stored);
  }
  if (first === undefined) {
    return { read: false, kept: undefined };
  }
  return { read: true, kept: parseDraft(first, draft) };
}

// Keeps draft under key, or forgets the draft under key when draft is
// undefined, as once it is sent or saved. A browser that refuses, such as
// when its storage is full, keeps nothing.
function keepLocalDraft(key: string, draft: unknown): void {
  const storage = storageOrNull();
  try {
    if (draft === undefined) {
      storage?.removeItem(`${KEY_PREFIX}${key}`);
      return;
    }
    storage?.setItem(`${KEY_PREFIX}${key}`, JSON.stringify(draft));
  } catch {
    // Nothing is kept; the draft is still on the page.
  }
}

export { keepLocalDraft, readLocalDraft, useKeptDraft };
