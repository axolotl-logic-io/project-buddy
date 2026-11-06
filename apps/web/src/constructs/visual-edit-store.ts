import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { ownPromptOwnedBy } from "@/accounts/owner-scope.ts";
import {
  parseConstructDefinition,
  storedConstructPrompt,
} from "@/constructs/construct-definition.ts";
import { normalizeVisualDescription } from "@/constructs/visual.ts";
import { inTransaction } from "@/db/client.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { parseOwnPromptId, type UserId } from "@/ids.ts";

import { earlierConstructText } from "@/prompts/earlier-built-in-texts.ts";

const DESCRIPTION_MAX = 4000;
const METADATA_EDIT = z.object({
  name: z.string().trim().min(1).optional(),
  prompt: z.string().optional(),
  visualDescription: z
    .string()
    .transform(normalizeVisualDescription)
    .pipe(z.string().max(DESCRIPTION_MAX))
    .optional(),
});
type ConstructMetadataEdit = z.infer<typeof METADATA_EDIT>;
type ConstructMetadataOutcome =
  | {
      readonly kind: "saved";
      readonly visualChanged: boolean;
      readonly description: string | undefined;
    }
  | { readonly kind: "not-found" | "description-required" };
// Serializes with generation attachment and merges server references, never draft references.
async function editConstructMetadata(
  owner: UserId,
  id: string,
  input: ConstructMetadataEdit,
): Promise<ConstructMetadataOutcome> {
  const edit = METADATA_EDIT.parse(input);
  const parsedId = parseOwnPromptId(id);
  if (parsedId === undefined) {
    return { kind: "not-found" };
  }
  return await inTransaction(async (tx): Promise<ConstructMetadataOutcome> => {
    const [row] = await tx
      .select()
      .from(ownPrompts)
      .where(
        and(
          ownPromptOwnedBy(owner),
          eq(ownPrompts.id, parsedId),
          eq(ownPrompts.kind, "buddy"),
          isNull(ownPrompts.retiredAt),
        ),
      )
      .for("update");
    const definition = parseConstructDefinition(row?.parts);
    if (row === undefined || definition === undefined) {
      return { kind: "not-found" };
    }
    if (edit.visualDescription === "" && definition.visual !== undefined) {
      return { kind: "description-required" };
    }
    const previousDescription = normalizeVisualDescription(
      definition.visual?.description ?? "",
    );
    let { visual } = definition;
    if (edit.visualDescription !== undefined && edit.visualDescription !== "") {
      visual = { ...visual, version: 1, description: edit.visualDescription };
    }
    await tx
      .update(ownPrompts)
      .set({
        name: edit.name,
        parts: storedConstructPrompt(
          earlierConstructText({
            ...definition,
            prompt: edit.prompt ?? definition.prompt,
            visual,
          }),
        ),
        updatedAt: sql`now()`,
      })
      .where(and(ownPromptOwnedBy(owner), eq(ownPrompts.id, parsedId)));
    const description = visual?.description;
    return {
      kind: "saved",
      description,
      visualChanged:
        description !== undefined &&
        normalizeVisualDescription(description) !== previousDescription,
    };
  });
}

export type { ConstructMetadataEdit, ConstructMetadataOutcome };
export { editConstructMetadata };
