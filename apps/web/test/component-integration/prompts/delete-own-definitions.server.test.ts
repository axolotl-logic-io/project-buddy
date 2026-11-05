import { describe, expect, test } from "vitest";
import { cloneActivity, getOwnActivity } from "@/activities/activity-store.ts";
import { deleteActivityAction } from "@/app/(workspace)/activities/actions.ts";
import { deleteConstructAction } from "@/app/(workspace)/constructs/actions.ts";
import {
  cloneConstruct,
  getOwnConstruct,
} from "@/constructs/construct-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

interface DeleteKind {
  readonly name: string;
  readonly source: string;
  readonly field: string;
  readonly path: string;
  readonly clone: typeof cloneConstruct | typeof cloneActivity;
  readonly read: typeof getOwnConstruct | typeof getOwnActivity;
  readonly remove: typeof deleteConstructAction;
}
const KINDS: readonly DeleteKind[] = [
  {
    name: "construct",
    source: "vellum",
    field: "constructId",
    path: "/constructs",
    clone: cloneConstruct,
    read: getOwnConstruct,
    remove: deleteConstructAction,
  },
  {
    name: "activity",
    source: "brainstorming",
    field: "activityId",
    path: "/activities",
    clone: cloneActivity,
    read: getOwnActivity,
    remove: deleteActivityAction,
  },
];
describe("deleting own constructs and activities", () => {
  test.each(KINDS)("deletes a $name only for its owner", async (kind) => {
    const [owner, other] = await Promise.all([testUser(), testUser()]);
    const copy = await kind.clone(owner.id, kind.source);
    if (copy === undefined) {
      throw new Error("No copy created");
    }
    const form = new FormData();
    form.set(kind.field, copy.id);
    await signIn(other);
    await expectRedirect(() => kind.remove(form), `${kind.path}?deleted=1`);
    expect(await kind.read(owner.id, copy.id)).toBeDefined();
    await signIn(owner);
    await expectRedirect(() => kind.remove(form), `${kind.path}?deleted=1`);
    expect(await kind.read(owner.id, copy.id)).toBeUndefined();
  });
});
