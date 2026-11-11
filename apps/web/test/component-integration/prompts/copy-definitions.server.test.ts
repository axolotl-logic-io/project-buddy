import { expect, test, vi } from "vitest";
import {
  cloneActivity,
  listOwnActivities,
} from "@/activities/activity-store.ts";
import { cloneActivityAction } from "@/app/(workspace)/activities/actions.ts";
import { cloneConstructAction } from "@/app/(workspace)/constructs/actions.ts";
import { cloneSpellAction } from "@/app/(workspace)/spellbook/actions.ts";
import {
  cloneConstruct,
  listConstructs,
} from "@/constructs/construct-store.ts";
import { cloneSpell, listOwnSpells } from "@/spells/spell-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/chat-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

interface CopyKind {
  readonly kind: string;
  readonly source: string;
  readonly create:
    | typeof cloneConstruct
    | typeof cloneActivity
    | typeof cloneSpell;
  readonly copy: typeof cloneConstructAction;
  readonly list:
    | typeof listConstructs
    | typeof listOwnActivities
    | typeof listOwnSpells;
}
const KINDS: readonly CopyKind[] = [
  {
    kind: "construct",
    source: "vellum",
    create: cloneConstruct,
    copy: cloneConstructAction,
    list: listConstructs,
  },
  {
    kind: "activity",
    source: "brainstorming",
    create: cloneActivity,
    copy: cloneActivityAction,
    list: listOwnActivities,
  },
  {
    kind: "spell",
    source: "ask-one-question",
    create: cloneSpell,
    copy: cloneSpellAction,
    list: listOwnSpells,
  },
];

test.each(KINDS)(
  "Make a copy cannot copy another user's private $kind",
  async (kind) => {
    const [owner, other] = await Promise.all([testUser(), testUser()]);
    const original = await kind.create(owner.id, kind.source);
    if (original === undefined) {
      throw new Error("No private definition created");
    }
    await signIn(other);
    await expectNotFound(() => kind.copy(formOf({ sourceId: original.id })));
    expect(await kind.list(other.id)).toEqual([]);
    expect(await kind.list(owner.id)).toEqual([original]);
  },
);

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
