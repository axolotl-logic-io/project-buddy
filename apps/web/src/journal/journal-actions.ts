"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/auth/current-user.ts";
import { PROJECT_ID } from "@/ids.ts";
import { EDIT, SECTION_KIND } from "@/journal/journal.ts";
import { type SectionResult, writeSection } from "@/journal/journal-store.ts";

const REQUEST = z.object({
  projectId: PROJECT_ID,
  kind: SECTION_KIND,
  basedOn: z.number().int().nonnegative().optional(),
  edit: EDIT.optional(),
  undo: z.number().int().positive().optional(),
});

async function changeSectionAction(input: unknown): Promise<SectionResult> {
  const user = await requireUser();
  const request = REQUEST.safeParse(input);
  if (!request.success) {
    return { status: "not-changed", reason: "invalid" };
  }
  const result = await writeSection(user.id, {
    ...request.data,
    author: "person",
  });
  if (result.status === "changed") {
    refresh();
  }
  return result;
}

export { changeSectionAction };
