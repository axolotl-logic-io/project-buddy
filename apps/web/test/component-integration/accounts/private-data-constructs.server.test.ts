// use_case_private_data for constructs, with two users side by side: another
// user's construct is not found, exactly as an unknown id is, through the construct
// store and on the construct page, and is never on the constructs page. Each signed
// in as their own account sees their own.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import WorkshopPage from "@/app/(workspace)/workshop/page.tsx";
import {
  cloneConstruct,
  deleteConstruct,
  getOwnConstruct,
  listConstructs,
  type OwnConstruct,
  updateConstruct,
} from "@/constructs/construct-store.ts";
import { type ConstructId, DEFAULT_CONSTRUCT_ID } from "@/constructs/index.ts";
import { CONSTRUCTS_COPY } from "@/ui/copy/constructs.ts";
import { userConstructIdFixture } from "../../support/id-fixtures.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

const HER_CONSTRUCT_EDIT = { name: "Hers now" };
const NAME_SUFFIX_LENGTH = 8;

// What reading, cloning, editing and deleting a construct by one id answered.
interface ConstructUses {
  readonly read: OwnConstruct | undefined;
  readonly clone: OwnConstruct | undefined;
  readonly update: OwnConstruct | undefined;
  readonly delete: boolean;
}

// What her reading, cloning, editing and deleting the construct with this id
// answered, in that order.
async function constructUses(her: User, id: string): Promise<ConstructUses> {
  return {
    read: await getOwnConstruct(her.id, id),
    clone: await cloneConstruct(her.id, id),
    update: await updateConstruct(her.id, id, HER_CONSTRUCT_EDIT),
    delete: await deleteConstruct(her.id, id),
  };
}

// A clone of the built-in construct, of the owner's.
async function cloneOf(
  owner: User,
  builtIn: ConstructId,
): Promise<OwnConstruct> {
  const clone = await cloneConstruct(owner.id, builtIn);
  if (clone === undefined) {
    throw new Error(`${builtIn} could not be cloned`);
  }
  return clone;
}

// A clone of the built-in construct, of the owner's, renamed to a name no
// built-in construct or other test has, so it shows only where the clone does;
// the clone's name.
async function namedClone(owner: User, builtIn: ConstructId): Promise<string> {
  const { id } = await cloneOf(owner, builtIn);
  const name = `Clone ${crypto.randomUUID().slice(0, NAME_SUFFIX_LENGTH)}`;
  await updateConstruct(owner.id, id, { name });
  return name;
}

// The signed-in user's page for the construct with this id.
function constructPage(constructId: string): Promise<unknown> {
  return ConstructPage({
    params: Promise.resolve({ constructId }),
    searchParams: Promise.resolve({}),
  });
}

// The signed-in user's constructs page, as HTML.
async function constructsHtml(): Promise<string> {
  return renderToStaticMarkup(
    await WorkshopPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({}),
    }),
  );
}

describe("use_case_private_data", () => {
  // By its id as stored and in capitals; it stays as it was, and each
  // user's list holds only their own constructs.
  test("another user's construct is not found to read, clone, update or delete", async () => {
    const { her, other } = await twoUsers();
    const theirConstruct = await cloneOf(other, DEFAULT_CONSTRUCT_ID);
    const unknown = await constructUses(her, userConstructIdFixture());

    expect(await listConstructs(her.id)).toEqual([]);
    expect(await constructUses(her, theirConstruct.id)).toEqual(unknown);
    expect(await constructUses(her, theirConstruct.id.toUpperCase())).toEqual(
      unknown,
    );
    expect(await listConstructs(her.id)).toEqual([]);

    const herConstruct = await cloneConstruct(her.id, DEFAULT_CONSTRUCT_ID);
    expect(herConstruct).toBeDefined();
    expect(await listConstructs(her.id)).toEqual([herConstruct]);
    expect(await listConstructs(other.id)).toEqual([theirConstruct]);
    expect(await getOwnConstruct(other.id, theirConstruct.id)).toEqual(
      theirConstruct,
    );
  });

  test("another user's construct is never listed", async () => {
    const { her, other } = await twoUsers();
    const herNames = [
      await namedClone(her, "vellum"),
      await namedClone(her, "lumen"),
    ];
    const herHtml = await constructsHtml();
    expect(herNames.filter((name) => herHtml.includes(name))).toEqual(herNames);
    await signIn(other);

    const theirHtml = await constructsHtml();

    expect(herNames.filter((name) => theirHtml.includes(name))).toEqual([]);
    expect(theirHtml).toContain(CONSTRUCTS_COPY.noOwn);
  });

  test("another user's construct page, or an unknown one, can't be found", async () => {
    const { her, other } = await twoUsers();
    const hers = await cloneOf(her, "vellum");
    await signIn(other);

    await expectNotFound(() => constructPage(crypto.randomUUID()));
    await expectNotFound(() => constructPage(hers.id));
    await expectNotFound(() => constructPage("not-a-construct"));
    await expectNotFound(() => constructPage("VELLUM"));

    await signIn(her);
    await expect(constructPage(hers.id)).resolves.toBeDefined();
  });
});
