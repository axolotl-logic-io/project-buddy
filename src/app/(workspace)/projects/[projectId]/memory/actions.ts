"use server";

import { refresh } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PROJECT_ID } from "@/ids.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { restoreMemoryVersion, saveMemory } from "@/memory/memory-store.ts";

// What the last save or restore from a form did: nothing yet, saved, or
// refused because the memory changed since the page showed it.
interface MemoryFormState {
  readonly kind: "idle" | "saved" | "outdated";
}

// A browser sends a textarea's line breaks as CRLF.
const LINE_BREAK = /\r\n?/gu;

// A version number as a form sends it: plain digits, nothing else.
const DIGITS = /^\d+$/u;

const VERSION_FIELD = z
  .string()
  .regex(DIGITS)
  .transform(Number)
  .pipe(MEMORY_VERSION_NUMBER);

const SAVE_MEMORY_FORM = z.object({
  projectId: PROJECT_ID,
  basedOn: VERSION_FIELD,
  text: z.string().transform((text) => text.replace(LINE_BREAK, "\n")),
});

const RESTORE_MEMORY_FORM = z.object({
  projectId: PROJECT_ID,
  version: VERSION_FIELD,
  basedOn: VERSION_FIELD,
});

export type { MemoryFormState };

// Saves her text as the project's memory, unless it changed since the
// version she edited. Either way the page then shows the newest version. A
// form whose project or version is malformed is not found.
export async function saveMemoryAction(
  _state: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> {
  const form = SAVE_MEMORY_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const result = await saveMemory({ ...form.data, author: "user" });
  refresh();
  return { kind: result.kind };
}

// Restores an earlier version as the project's newest memory, unless it
// changed since the page showed it. A version the project lacks is not
// found.
export async function restoreMemoryAction(
  _state: MemoryFormState,
  formData: FormData,
): Promise<MemoryFormState> {
  const form = RESTORE_MEMORY_FORM.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    notFound();
  }
  const result = await restoreMemoryVersion({ ...form.data, author: "user" });
  if (result === undefined) {
    notFound();
  }
  refresh();
  return { kind: result.kind };
}
