// Own copies of built-in prompts across a release that renamed buddies to
// constructs, against the test database. The build before it stays live
// while a release migrates and again after a rollback, and knows an own
// copy is a built-in one's only when its stored text is exactly its own.
// So this build writes unchanged copies in that text, and reads copies that
// build wrote as copies of today's built-in ones. The earlier texts are
// recorded fixtures from that build.
import { eq } from "drizzle-orm";
import { expect, test } from "vitest";
import {
  cloneActivity,
  getOwnActivity,
  updateActivity,
} from "@/activities/activity-store.ts";
import { getActivity } from "@/activities/index.ts";
import { preparedOpening } from "@/activities/prepared-openings.ts";
import { parseConstructDefinition } from "@/constructs/construct-definition.ts";
import {
  cloneConstruct,
  getOwnConstruct,
  updateConstruct,
} from "@/constructs/construct-store.ts";
import { getConstruct } from "@/constructs/index.ts";
import { getDb } from "@/db/client.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import type { UserId } from "@/ids.ts";
import { publishListing } from "@/marketplace/listing-store.ts";
import { getSpell } from "@/spells/index.ts";
import { cloneSpell, getOwnSpell } from "@/spells/spell-store.ts";
import {
  EARLIER_BLENDER_MANUAL_LOOKUP,
  EARLIER_INTERVIEW,
  EARLIER_VELLUM_PROMPT,
} from "../../support/earlier-built-in-fixtures.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

const TERMS = { description: "", price: 0 };

async function storedParts(id: string): Promise<unknown> {
  const [row] = await getDb()
    .select({ parts: ownPrompts.parts })
    .from(ownPrompts)
    .where(eq(ownPrompts.id, id));
  return row?.parts;
}

// An own prompt as the earlier build writes it: its stored kind and parts.
async function earlierRow(
  owner: UserId,
  kind: "buddy" | "activity" | "spell",
  clonedFrom: string,
  parts: unknown,
): Promise<string> {
  const [row] = await getDb()
    .insert(ownPrompts)
    .values({ userId: owner, kind, name: "Earlier copy", parts, clonedFrom })
    .returning({ id: ownPrompts.id });
  if (row === undefined) {
    throw new Error("The earlier copy was not saved");
  }
  return row.id;
}

test("an unchanged clone is stored in the earlier build's text, so that build knows it as a built-in one", async () => {
  const { id: owner } = await testUser();

  const vellum = await cloneConstruct(owner, "vellum");
  const interview = await cloneActivity(owner, "interview");
  const blender = await cloneSpell(owner, "blender-manual-lookup");
  if (
    vellum === undefined ||
    interview === undefined ||
    blender === undefined
  ) {
    throw new Error("The built-in ones could not be cloned");
  }

  expect(await storedParts(vellum.id)).toMatchObject({
    voice: EARLIER_VELLUM_PROMPT,
    habits: "",
  });
  expect(await storedParts(interview.id)).toEqual({
    instructions: EARLIER_INTERVIEW.prompt,
    openingKickoff: EARLIER_INTERVIEW.openingRequest,
  });
  expect(await storedParts(blender.id)).toEqual({
    whenToUse: EARLIER_BLENDER_MANUAL_LOOKUP.whenToUse,
    instructions: EARLIER_BLENDER_MANUAL_LOOKUP.prompt,
  });
  // The earlier build compares the parsed prompt with its own exactly.
  expect(parseConstructDefinition(await storedParts(vellum.id))?.prompt).toBe(
    EARLIER_VELLUM_PROMPT,
  );
  expect(vellum.definition.prompt).toBe(
    getConstruct("vellum").definition.prompt,
  );
  expect(vellum.definition.visual).toEqual(
    getConstruct("vellum").definition.visual,
  );
  expect(interview.definition).toEqual(getActivity("interview").definition);
});

test("an unchanged clone can't be listed and keeps its prepared openings", async () => {
  const { id: owner } = await testUser();

  const vellum = await cloneConstruct(owner, "vellum");
  const interview = await cloneActivity(owner, "interview");
  if (vellum === undefined || interview === undefined) {
    throw new Error("The built-in ones could not be cloned");
  }

  expect(
    await publishListing(
      owner,
      { kind: "construct", promptId: vellum.id },
      TERMS,
    ),
  ).toEqual({ kind: "built-in" });
  expect(
    await publishListing(
      owner,
      { kind: "activity", promptId: interview.id },
      TERMS,
    ),
  ).toEqual({ kind: "built-in" });
  expect(preparedOpening(vellum.definition, interview.definition)).toBe(
    preparedOpening(
      getConstruct("vellum").definition,
      getActivity("interview").definition,
    ),
  );
});

test("a copy the earlier build wrote reads as today's built-in one, can't be listed and keeps its prepared openings", async () => {
  const { id: owner } = await testUser();
  const vellumId = await earlierRow(owner, "buddy", "vellum", {
    voice: EARLIER_VELLUM_PROMPT,
    habits: "",
  });
  const interviewId = await earlierRow(owner, "activity", "interview", {
    instructions: EARLIER_INTERVIEW.prompt,
    openingKickoff: EARLIER_INTERVIEW.openingRequest,
  });
  const blenderId = await earlierRow(owner, "spell", "blender-manual-lookup", {
    whenToUse: EARLIER_BLENDER_MANUAL_LOOKUP.whenToUse,
    instructions: EARLIER_BLENDER_MANUAL_LOOKUP.prompt,
  });

  const vellum = await getOwnConstruct(owner, vellumId);
  const interview = await getOwnActivity(owner, interviewId);
  const blender = await getOwnSpell(owner, blenderId);
  if (vellum === undefined || interview === undefined) {
    throw new Error("The earlier copies were not found");
  }

  expect(vellum.definition.prompt).toBe(
    getConstruct("vellum").definition.prompt,
  );
  expect(vellum.definition.visual).toBeUndefined();
  expect(interview.definition).toEqual(getActivity("interview").definition);
  expect(blender?.definition).toEqual(
    getSpell("blender-manual-lookup").definition,
  );
  expect(
    await publishListing(
      owner,
      { kind: "construct", promptId: vellumId },
      TERMS,
    ),
  ).toEqual({ kind: "built-in" });
  expect(
    await publishListing(owner, { kind: "spell", promptId: blenderId }, TERMS),
  ).toEqual({ kind: "built-in" });
  expect(
    preparedOpening(vellum.definition, interview.definition),
  ).toBeDefined();
});

test("an edited copy is stored as written, in either wording, and can be listed", async () => {
  const { id: owner } = await testUser();
  const clone = await cloneConstruct(owner, "vellum");
  const activity = await cloneActivity(owner, "interview");
  if (clone === undefined || activity === undefined) {
    throw new Error("The built-in ones could not be cloned");
  }
  const edited = `${getConstruct("vellum").definition.prompt}\n- Extra.`;
  const editedEarlier = `${EARLIER_VELLUM_PROMPT}\n- Extra.`;

  await updateConstruct(owner, clone.id, { definition: { prompt: edited } });
  expect(await storedParts(clone.id)).toEqual({ voice: edited, habits: "" });
  expect((await getOwnConstruct(owner, clone.id))?.definition).toEqual({
    prompt: edited,
  });

  await updateConstruct(owner, clone.id, {
    definition: { prompt: editedEarlier },
  });
  expect(await storedParts(clone.id)).toEqual({
    voice: editedEarlier,
    habits: "",
  });
  expect((await getOwnConstruct(owner, clone.id))?.definition).toEqual({
    prompt: editedEarlier,
  });
  expect(
    (
      await publishListing(
        owner,
        { kind: "construct", promptId: clone.id },
        TERMS,
      )
    ).kind,
  ).toBe("published");

  const openingRequest = "Ask me about birdhouses.";
  await updateActivity(owner, activity.id, {
    definition: { ...getActivity("interview").definition, openingRequest },
  });
  expect(await storedParts(activity.id)).toEqual({
    instructions: getActivity("interview").definition.prompt,
    openingKickoff: openingRequest,
  });
});

test("an edited copy put back to a built-in one's text is stored in the earlier build's text again", async () => {
  const { id: owner } = await testUser();
  const clone = await cloneConstruct(owner, "vellum");
  if (clone === undefined) {
    throw new Error("Vellum could not be cloned");
  }

  await updateConstruct(owner, clone.id, {
    definition: {
      ...clone.definition,
      prompt: `${clone.definition.prompt}\n- Extra.`,
    },
  });
  await updateConstruct(owner, clone.id, {
    definition: {
      ...clone.definition,
      prompt: getConstruct("vellum").definition.prompt,
    },
  });

  expect(await storedParts(clone.id)).toMatchObject({
    voice: EARLIER_VELLUM_PROMPT,
    habits: "",
  });
  expect(parseConstructDefinition(await storedParts(clone.id))?.visual).toEqual(
    clone.definition.visual,
  );
});
