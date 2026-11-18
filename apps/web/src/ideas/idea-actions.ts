"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/auth/current-user.ts";
import { IDEA_REQUEST, type IdeaResult } from "@/ideas/idea.ts";
import { changeIdea } from "@/ideas/idea-store.ts";
import { IDEAS_COPY } from "@/ui/copy/ideas.ts";

async function changeIdeaAction(request: unknown): Promise<IdeaResult> {
  const user = await requireUser();
  const parsed = IDEA_REQUEST.safeParse(request);
  if (!parsed.success) {
    return { kind: "problem", reason: "invalid", text: IDEAS_COPY.invalid };
  }
  const result = await changeIdea(user.id, parsed.data);
  if (result.kind === "saved") {
    refresh();
    return { kind: "saved", message: IDEAS_COPY.saved };
  }
  return result;
}

export { changeIdeaAction };
