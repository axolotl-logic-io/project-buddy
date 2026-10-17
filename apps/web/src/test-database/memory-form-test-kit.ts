// For server tests: the memory page's forms, sent as the signed-in user
// sends them, through their Server Actions. The actions refresh the page
// with next/cache's `refresh()`, which throws outside a Server Action, so a
// test file that uses this kit replaces it:
//   vi.mock("next/cache", async (importOriginal) => ({
//     ...(await importOriginal<typeof import("next/cache")>()),
//     refresh: (): void => {},
//   }));
import {
  type MemoryFormState,
  restoreMemoryAction,
  saveMemoryAction,
} from "@/app/(workspace)/projects/[projectId]/memory/actions.ts";
import type { ProjectId } from "@/ids.ts";

const IDLE: MemoryFormState = { kind: "idle" };

// The form's fields, as the browser sends them.
function memoryForm(fields: Record<string, string | number>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, String(value));
  }
  return form;
}

// Saves text as the project's memory from the editor, which showed version
// basedOn, and says what the save did.
function saveFromEditor(
  projectId: ProjectId,
  text: string,
  basedOn: number,
): Promise<MemoryFormState> {
  return saveMemoryAction(IDLE, memoryForm({ projectId, text, basedOn }));
}

// Restores version from the history, which showed version basedOn as the
// newest, and says what the restore did.
function restoreFromHistory(
  projectId: ProjectId,
  version: number,
  basedOn: number,
): Promise<MemoryFormState> {
  return restoreMemoryAction(IDLE, memoryForm({ projectId, version, basedOn }));
}

export { restoreFromHistory, saveFromEditor };
