import { describe, expect, test, vi } from "vitest";
import { retireConstructAction } from "@/app/(workspace)/constructs/actions.ts";
import {
  cloneConstruct,
  getOwnConstruct,
} from "@/constructs/construct-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

interface RetirementKind {
  readonly name: string;
  readonly source: string;
  readonly field: string;
  readonly path: string;
  readonly query: Record<string, string>;
  readonly clone: typeof cloneConstruct;
  readonly read: typeof getOwnConstruct;
  readonly remove: typeof retireConstructAction;
}
const KINDS: readonly RetirementKind[] = [
  {
    name: "construct",
    source: "vellum",
    field: "constructId",
    path: "/workshop",
    query: { retired: "1" },
    clone: cloneConstruct,
    read: getOwnConstruct,
    remove: retireConstructAction,
  },
];
describe("retiring own constructs", () => {
  test.each(KINDS)("retires a $name only for its owner", async (kind) => {
    const [owner, other] = await Promise.all([testUser(), testUser()]);
    const copy = await kind.clone(owner.id, kind.source);
    if (copy === undefined) {
      throw new Error("No copy created");
    }
    const form = new FormData();
    form.set(kind.field, copy.id);
    await signIn(other);
    await expectRedirect(() => kind.remove(form), kind.path, kind.query);
    expect(await kind.read(owner.id, copy.id)).toBeDefined();
    await signIn(owner);
    await expectRedirect(() => kind.remove(form), kind.path, kind.query);
    expect(await kind.read(owner.id, copy.id)).toBeUndefined();
  });
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
