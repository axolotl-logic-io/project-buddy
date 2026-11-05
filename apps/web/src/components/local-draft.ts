// What the viewer has typed but not yet sent or saved, such as a chat
// message or an edit to a construct's prompt, kept in this browser's local
// storage under a key of its own, so that leaving the page, reloading or
// closing the tab doesn't lose it. A draft stays in this browser: the server
// never sees it. Without storage, as when the browser blocks it, nothing is
// kept and no draft is found, and the page works as before. Only the browser
// imports this module.
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

// The draft kept under key, or undefined if there is none, or none that
// draft parses, as after a change of its shape.
function readLocalDraft<Draft>(
  key: string,
  draft: z.ZodType<Draft>,
): Draft | undefined {
  try {
    const stored = storageOrNull()?.getItem(`${KEY_PREFIX}${key}`) ?? null;
    if (stored === null) {
      return undefined;
    }
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

export { keepLocalDraft, readLocalDraft };
