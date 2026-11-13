import { expect, test, vi } from "vitest";
import { cloneConstructAction } from "@/app/(workspace)/constructs/actions.ts";
import {
  cloneConstruct,
  listConstructs,
} from "@/constructs/construct-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf } from "../test-database/chat-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

interface CopyKind {
  readonly kind: string;
  readonly source: string;
  readonly create: typeof cloneConstruct;
  readonly copy: typeof cloneConstructAction;
  readonly list: typeof listConstructs;
}
const KINDS: readonly CopyKind[] = [
  {
    kind: "construct",
    source: "vellum",
    create: cloneConstruct,
    copy: cloneConstructAction,
    list: listConstructs,
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
