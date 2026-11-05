import { describe, expect, test } from "vitest";
import { cloneActivity, getOwnActivity } from "@/activities/activity-store.ts";
import { deleteActivityAction } from "@/app/(workspace)/activities/actions.ts";
import { deleteBuddyAction } from "@/app/(workspace)/buddies/actions.ts";
import { cloneBuddy, getOwnBuddy } from "@/buddies/buddy-store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

interface DeleteKind {
  readonly name: string;
  readonly source: string;
  readonly field: string;
  readonly path: string;
  readonly clone: typeof cloneBuddy | typeof cloneActivity;
  readonly read: typeof getOwnBuddy | typeof getOwnActivity;
  readonly remove: typeof deleteBuddyAction;
}
const KINDS: readonly DeleteKind[] = [
  {
    name: "buddy",
    source: "vellum",
    field: "buddyId",
    path: "/buddies",
    clone: cloneBuddy,
    read: getOwnBuddy,
    remove: deleteBuddyAction,
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
describe("deleting own buddies and activities", () => {
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
