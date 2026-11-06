import { expect, test } from "vitest";
import { generateMetadata as activityMetadata } from "@/app/(workspace)/activities/[activityId]/page.tsx";
import { generateMetadata as constructMetadata } from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import { generateMetadata as spellMetadata } from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import { createConstruct } from "@/constructs/construct-store.ts";
import { listSpells } from "@/spells/index.ts";
import { testUser } from "../../../support/test-database/user-test-kit.ts";
import { signIn } from "../../test-database/session-test-kit.ts";

test("definition titles identify the definition while a private foreign name stays undisclosed", async () => {
  const owner = await testUser();
  const outsider = await testUser();
  const own = await createConstruct(owner.id, {
    name: "Private garden guide",
    definition: { prompt: "Private instructions." },
  });
  await signIn(owner);
  expect(
    await constructMetadata({
      params: Promise.resolve({ constructId: own.id }),
      searchParams: Promise.resolve({}),
    }),
  ).toEqual({ title: "Private garden guide · Project Buddy" });
  expect(
    await activityMetadata({
      params: Promise.resolve({ activityId: "brainstorming" }),
      searchParams: Promise.resolve({}),
    }),
  ).toEqual({ title: "Brainstorming · Project Buddy" });
  const [spell] = listSpells();
  if (spell === undefined) {
    throw new Error("No built-in spell");
  }
  expect(
    await spellMetadata({
      params: Promise.resolve({ spellId: spell.id }),
      searchParams: Promise.resolve({}),
    }),
  ).toEqual({ title: `${spell.name} · Project Buddy` });
  await signIn(outsider);
  expect(
    await constructMetadata({
      params: Promise.resolve({ constructId: own.id }),
      searchParams: Promise.resolve({}),
    }),
  ).toEqual({ title: "Construct · Project Buddy" });
});
