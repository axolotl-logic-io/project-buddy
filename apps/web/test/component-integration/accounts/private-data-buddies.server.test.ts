// use_case_private_data for buddies, with two users side by side: another
// user's buddy is not found, exactly as an unknown id is, through the buddy
// store and on the buddy page, and is never on the buddies page. Each signed
// in as their own account sees their own.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import BuddiesPage from "@/app/(workspace)/buddies/(list)/page.tsx";
import BuddyPage from "@/app/(workspace)/buddies/[buddyId]/page.tsx";
import {
  cloneBuddy,
  deleteBuddy,
  getOwnBuddy,
  listBuddies,
  type OwnBuddy,
  updateBuddy,
} from "@/buddies/buddy-store.ts";
import { type BuddyId, DEFAULT_BUDDY_ID } from "@/buddies/index.ts";
import { BUDDIES_COPY } from "@/ui/copy/buddies.ts";
import { userBuddyIdFixture } from "../../support/id-fixtures.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

const HER_BUDDY_EDIT = { name: "Hers now" };
const NAME_SUFFIX_LENGTH = 8;

// What reading, cloning, editing and deleting a buddy by one id answered.
interface BuddyUses {
  readonly read: OwnBuddy | undefined;
  readonly clone: OwnBuddy | undefined;
  readonly update: OwnBuddy | undefined;
  readonly delete: boolean;
}

// What her reading, cloning, editing and deleting the buddy with this id
// answered, in that order.
async function buddyUses(her: User, id: string): Promise<BuddyUses> {
  return {
    read: await getOwnBuddy(her.id, id),
    clone: await cloneBuddy(her.id, id),
    update: await updateBuddy(her.id, id, HER_BUDDY_EDIT),
    delete: await deleteBuddy(her.id, id),
  };
}

// A clone of the built-in buddy, of the owner's.
async function cloneOf(owner: User, builtIn: BuddyId): Promise<OwnBuddy> {
  const clone = await cloneBuddy(owner.id, builtIn);
  if (clone === undefined) {
    throw new Error(`${builtIn} could not be cloned`);
  }
  return clone;
}

// A clone of the built-in buddy, of the owner's, renamed to a name no
// built-in buddy or other test has, so it shows only where the clone does;
// the clone's name.
async function namedClone(owner: User, builtIn: BuddyId): Promise<string> {
  const { id } = await cloneOf(owner, builtIn);
  const name = `Clone ${crypto.randomUUID().slice(0, NAME_SUFFIX_LENGTH)}`;
  await updateBuddy(owner.id, id, { name });
  return name;
}

// The signed-in user's page for the buddy with this id.
function buddyPage(buddyId: string): Promise<unknown> {
  return BuddyPage({
    params: Promise.resolve({ buddyId }),
    searchParams: Promise.resolve({}),
  });
}

// The signed-in user's buddies page, as HTML.
async function buddiesHtml(): Promise<string> {
  return renderToStaticMarkup(await BuddiesPage());
}

describe("use_case_private_data", () => {
  // By its id as stored and in capitals; it stays as it was, and each
  // user's list holds only their own buddies.
  test("another user's buddy is not found to read, clone, update or delete", async () => {
    const { her, other } = await twoUsers();
    const theirBuddy = await cloneOf(other, DEFAULT_BUDDY_ID);
    const unknown = await buddyUses(her, userBuddyIdFixture());

    expect(await listBuddies(her.id)).toEqual([]);
    expect(await buddyUses(her, theirBuddy.id)).toEqual(unknown);
    expect(await buddyUses(her, theirBuddy.id.toUpperCase())).toEqual(unknown);
    expect(await listBuddies(her.id)).toEqual([]);

    const herBuddy = await cloneBuddy(her.id, DEFAULT_BUDDY_ID);
    expect(herBuddy).toBeDefined();
    expect(await listBuddies(her.id)).toEqual([herBuddy]);
    expect(await listBuddies(other.id)).toEqual([theirBuddy]);
    expect(await getOwnBuddy(other.id, theirBuddy.id)).toEqual(theirBuddy);
  });

  test("another user's buddy is never listed", async () => {
    const { her, other } = await twoUsers();
    const herNames = [
      await namedClone(her, "hippy"),
      await namedClone(her, "mr-tee"),
    ];
    const herHtml = await buddiesHtml();
    expect(herNames.filter((name) => herHtml.includes(name))).toEqual(herNames);
    await signIn(other);

    const theirHtml = await buddiesHtml();

    expect(herNames.filter((name) => theirHtml.includes(name))).toEqual([]);
    expect(theirHtml).toContain(BUDDIES_COPY.noOwn);
  });

  test("another user's buddy page, or an unknown one, can't be found", async () => {
    const { her, other } = await twoUsers();
    const hers = await cloneOf(her, "hippy");
    await signIn(other);

    await expectNotFound(() => buddyPage(crypto.randomUUID()));
    await expectNotFound(() => buddyPage(hers.id));
    await expectNotFound(() => buddyPage("not-a-buddy"));
    await expectNotFound(() => buddyPage("HIPPY"));

    await signIn(her);
    await expect(buddyPage(hers.id)).resolves.toBeDefined();
  });
});
