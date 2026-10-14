// An edit to a memory's text that names the text it changes, so it can be
// applied to whatever the newest version is, and fails rather than guesses
// when that text is no longer there exactly once. It imports nothing, so the
// browser can use it.

// Replace oldText, which must occur exactly once, with newText. An empty
// oldText adds newText at the end instead.
interface MemoryEdit {
  readonly oldText: string;
  readonly newText: string;
}

// Why an edit left the text as it was: oldText was not there, or there more
// than once, or the edit would change nothing.
const MEMORY_EDIT_FAILURES = ["missing", "ambiguous", "unchanged"] as const;

type MemoryEditFailure = (typeof MEMORY_EDIT_FAILURES)[number];

type MemoryEditOutcome =
  | { readonly kind: "edited"; readonly text: string }
  | { readonly kind: "failed"; readonly reason: MemoryEditFailure };

// Added text starts a new paragraph after the text before it.
const PARAGRAPH_BREAK = "\n\n";

function editedText(text: string, { oldText, newText }: MemoryEdit): string {
  if (oldText !== "") {
    return text.replace(oldText, () => newText);
  }
  if (newText === "") {
    return text;
  }
  if (text.trim() === "") {
    return newText;
  }
  return `${text.trimEnd()}${PARAGRAPH_BREAK}${newText}`;
}

function occurrences(text: string, part: string): number {
  return text.split(part).length - 1;
}

// The text with the edit applied, or why it could not be.
function applyMemoryEdit(text: string, edit: MemoryEdit): MemoryEditOutcome {
  if (edit.oldText !== "") {
    const count = occurrences(text, edit.oldText);
    if (count === 0) {
      return { kind: "failed", reason: "missing" };
    }
    if (count > 1) {
      return { kind: "failed", reason: "ambiguous" };
    }
  }
  const edited = editedText(text, edit);
  if (edited === text) {
    return { kind: "failed", reason: "unchanged" };
  }
  return { kind: "edited", text: edited };
}

export type { MemoryEdit, MemoryEditFailure, MemoryEditOutcome };
export { applyMemoryEdit, MEMORY_EDIT_FAILURES };
