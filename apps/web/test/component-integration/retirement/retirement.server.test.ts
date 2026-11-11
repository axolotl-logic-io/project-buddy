import { describe, expect, test, vi } from "vitest";
import {
  cloneActivity,
  getOwnActivity,
  listOwnActivities,
  updateActivity,
} from "@/activities/activity-store.ts";
import { chosenActivity } from "@/activities/chosen-activity.ts";
import { retireConstructAction } from "@/app/(workspace)/constructs/actions.ts";
import {
  deleteRetiredDefinitionAction,
  restoreDefinitionAction,
} from "@/app/(workspace)/retirement/actions.ts";
import { getChat } from "@/chats/store.ts";
import { chosenConstruct } from "@/constructs/chosen-construct.ts";
import {
  cloneConstruct,
  getOwnConstruct,
  listConstructs,
  updateConstruct,
} from "@/constructs/construct-store.ts";
import {
  interviewConstruct,
  saveInterviewConstruct,
} from "@/constructs/interview-construct.ts";
import { startProject } from "@/conversations/start-quest.ts";
import { getDb } from "@/db/client.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import type { UserId } from "@/ids.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";
import type { OwnPrompt } from "@/prompts/own-prompt-store.ts";
import { type PromptKind, storedPromptKind } from "@/prompts/prompt.ts";
import {
  deleteRetiredDefinition,
  getRetiredDefinition,
  listRetiredDefinitions,
  restoreDefinition,
  retireDefinition,
} from "@/retirement/retirement-store.ts";
import { chosenSpell } from "@/spells/chosen-spell.ts";
import {
  cloneSpell,
  getOwnSpell,
  listOwnSpells,
  updateSpell,
} from "@/spells/spell-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { formerMembership } from "../../support/test-database/former-member-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
interface KindCase {
  readonly kind: PromptKind;
  readonly source: string;
  readonly clone: (
    owner: UserId,
    id: string,
  ) => Promise<OwnPrompt<unknown> | undefined>;
  readonly read: (
    owner: UserId,
    id: string,
  ) => Promise<OwnPrompt<unknown> | undefined>;
  readonly list: (owner: UserId) => Promise<OwnPrompt<unknown>[]>;
  readonly select: (owner: UserId, id: string) => Promise<unknown>;
  readonly update:
    | typeof updateConstruct
    | typeof updateActivity
    | typeof updateSpell;
}
const KINDS: readonly KindCase[] = [
  {
    kind: "construct",
    source: "lumen",
    clone: cloneConstruct,
    read: getOwnConstruct,
    list: listConstructs,
    update: updateConstruct,
    select: chosenConstruct,
  },
  {
    kind: "activity",
    source: "brainstorming",
    clone: cloneActivity,
    read: getOwnActivity,
    list: listOwnActivities,
    update: updateActivity,
    select: chosenActivity,
  },
  {
    kind: "spell",
    source: "ask-one-question",
    clone: cloneSpell,
    read: getOwnSpell,
    list: listOwnSpells,
    update: updateSpell,
    select: chosenSpell,
  },
];
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("use_case_retire_definitions", () => {
  test.each(KINDS)(
    "retiring a $kind hides it from active reads and refuses stale edits or clones",
    async (kind) => {
      const owner = await testUser();
      const copy = await kind.clone(owner.id, kind.source);
      if (copy === undefined) {
        throw new Error("No copy");
      }
      expect(await deleteRetiredDefinition(owner.id, copy.id)).toBe(false);
      expect(await retireDefinition(owner.id, kind.kind, copy.id)).toBe(true);
      const retired = await getRetiredDefinition(owner.id, copy.id);
      expect(retired).toMatchObject({
        id: copy.id,
        name: copy.name,
        kind: kind.kind,
      });
      expect(retired?.texts.length).toBeGreaterThan(0);
      expect(await kind.read(owner.id, copy.id)).toBeUndefined();
      expect(await kind.select(owner.id, copy.id)).toBeUndefined();
      expect(await kind.list(owner.id)).toEqual([]);
      expect(
        await kind.update(owner.id, copy.id, { name: "stale edit" }),
      ).toBeUndefined();
      expect(await kind.clone(owner.id, copy.id)).toBeUndefined();
      expect(await retireDefinition(owner.id, kind.kind, copy.id)).toBe(false);
      expect(
        (await getRetiredDefinition(owner.id, copy.id))?.retiredAt,
      ).toEqual(retired?.retiredAt);
    },
  );
  test("new quests reject a retired construct while existing conversations retain it", async () => {
    const owner = await testUser();
    const copy = await cloneConstruct(owner.id, "lumen");
    if (copy === undefined) {
      throw new Error("No copy");
    }
    await saveInterviewConstruct(owner.id, copy.id);
    await signIn(owner);
    const chosen = await chosenConstruct(owner.id, copy.id);
    if (chosen === undefined) {
      throw new Error("Her copy is not hers");
    }
    const started = await startProject(
      owner.id,
      PROJECT_NAME.parse("Fox"),
      chosen.construct,
    );
    if (started.kind !== "started") {
      throw new Error(`The quest didn't start: ${started.kind}`);
    }
    await expectRedirect(
      () => retireConstructAction(form({ constructId: copy.id })),
      "/constructs?retired=1",
    );
    expect(await chosenConstruct(owner.id, copy.id)).toBeUndefined();
    expect((await interviewConstruct(owner.id)).id).toBe("vellum");
    expect((await getChat(owner.id, started.chat.id))?.construct).toEqual({
      name: copy.name,
      definition: copy.definition,
    });
    await restoreDefinition(owner.id, copy.id);
    expect((await interviewConstruct(owner.id)).id).toBe(copy.id);
  });
  test("a former quest membership gives no access to originals or Retirement changes", async () => {
    const [owner, member] = await Promise.all([testUser(), testUser()]);
    const project = await testData(owner).project("Formerly shared quest");
    await formerMembership(owner, member, project.id);
    await Promise.all(
      KINDS.map(async (kind) => {
        const copy = await kind.clone(owner.id, kind.source);
        if (copy === undefined) {
          throw new Error("No copy");
        }
        expect(await retireDefinition(member.id, kind.kind, copy.id)).toBe(
          false,
        );
        expect(await retireDefinition(owner.id, kind.kind, copy.id)).toBe(true);
        expect(await getRetiredDefinition(member.id, copy.id)).toBeUndefined();
        expect(await restoreDefinition(member.id, copy.id)).toBe(false);
        expect(await deleteRetiredDefinition(member.id, copy.id)).toBe(false);
        expect(await getRetiredDefinition(owner.id, copy.id)).toBeDefined();
      }),
    );
    expect(await listRetiredDefinitions(member.id)).toEqual([]);
    expect(await listRetiredDefinitions(owner.id)).toHaveLength(KINDS.length);
  });
});

describe("use_case_restore_retired_definition", () => {
  test.each(KINDS)(
    "restoring a $kind preserves its identity, text, and source",
    async (kind) => {
      const owner = await testUser();
      const copy = await kind.clone(owner.id, kind.source);
      if (copy === undefined) {
        throw new Error("No copy");
      }
      await retireDefinition(owner.id, kind.kind, copy.id);
      await signIn(owner);
      await expectRedirect(
        () => restoreDefinitionAction(form({ promptId: copy.id })),
        "/retirement?restored=1",
      );
      expect(await kind.read(owner.id, copy.id)).toEqual(copy);
      expect(await kind.select(owner.id, copy.id)).toBeDefined();
      expect(await listRetiredDefinitions(owner.id)).toEqual([]);
      expect(await restoreDefinition(owner.id, copy.id)).toBe(false);
    },
  );
  test("a copy bought before the Marketplace closed stays its buyer's private construct", async () => {
    const [buyer, stranger] = await Promise.all([testUser(), testUser()]);
    const [row] = await getDb()
      .insert(ownPrompts)
      .values({
        userId: buyer.id,
        kind: storedPromptKind("construct"),
        name: "Bought guide",
        parts: { prompt: "Another user's construct, bought earlier." },
        boughtFrom: crypto.randomUUID(),
      })
      .returning({ id: ownPrompts.id });
    if (row === undefined) {
      throw new Error("No bought copy");
    }
    const gold = await readGoldBalance(buyer.id);
    const before = await getOwnConstruct(buyer.id, row.id);
    expect(before?.name).toBe("Bought guide");
    expect(await getOwnConstruct(stranger.id, row.id)).toBeUndefined();

    await retireDefinition(buyer.id, "construct", row.id);
    expect(await getOwnConstruct(buyer.id, row.id)).toBeUndefined();
    await restoreDefinition(buyer.id, row.id);
    expect(await getOwnConstruct(buyer.id, row.id)).toEqual(before);

    const edited = await updateConstruct(buyer.id, row.id, {
      definition: { prompt: "Now made my own." },
    });
    expect(edited?.definition.prompt).toBe("Now made my own.");
    const clone = await cloneConstruct(buyer.id, row.id);
    expect(clone?.definition.prompt).toBe("Now made my own.");
    expect(await readGoldBalance(buyer.id)).toEqual(gold);
  });
});

describe("use_case_delete_retired_definition", () => {
  test.each(KINDS)(
    "only a retired $kind can be deleted forever",
    async (kind) => {
      const owner = await testUser();
      const copy = await kind.clone(owner.id, kind.source);
      if (copy === undefined) {
        throw new Error("No copy");
      }
      await signIn(owner);
      await expectNotFound(() =>
        deleteRetiredDefinitionAction(form({ promptId: copy.id })),
      );
      await retireDefinition(owner.id, kind.kind, copy.id);
      await restoreDefinition(owner.id, copy.id);
      // A confirmation opened before restoration may not delete the now-active definition.
      await expectNotFound(() =>
        deleteRetiredDefinitionAction(form({ promptId: copy.id })),
      );
      expect(await kind.read(owner.id, copy.id)).toBeDefined();
      await retireDefinition(owner.id, kind.kind, copy.id);
      await expectRedirect(
        () => deleteRetiredDefinitionAction(form({ promptId: copy.id })),
        "/retirement?deleted=1",
      );
      expect(await getRetiredDefinition(owner.id, copy.id)).toBeUndefined();
      expect(await restoreDefinition(owner.id, copy.id)).toBe(false);
      expect(await deleteRetiredDefinition(owner.id, copy.id)).toBe(false);
    },
  );
  test("built-in, malformed, and wrong-kind ids change nothing", async () => {
    const owner = await testUser();
    const copy = await cloneActivity(owner.id, "brainstorming");
    if (copy === undefined) {
      throw new Error("No copy");
    }
    expect(await retireDefinition(owner.id, "construct", copy.id)).toBe(false);
    await Promise.all(
      ["vellum", "not-an-id", "00000000-0000-4000-8000-000000000000"].map(
        async (id) => {
          expect(await retireDefinition(owner.id, "construct", id)).toBe(false);
          expect(await getRetiredDefinition(owner.id, id)).toBeUndefined();
          expect(await restoreDefinition(owner.id, id)).toBe(false);
          expect(await deleteRetiredDefinition(owner.id, id)).toBe(false);
        },
      ),
    );
    expect(await getOwnActivity(owner.id, copy.id)).toBeDefined();
  });
});
