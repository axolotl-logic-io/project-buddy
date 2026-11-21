import { expect, test } from "vitest";
import { generateMetadata as constructMetadata } from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import { generateMetadata as spellMetadata } from "@/app/(workspace)/spellbook/[spellId]/page.tsx";
import { getConstruct } from "@/constructs/index.ts";
import { listSpells } from "@/spells/spell.ts";
import { testUser } from "../../../support/test-database/user-test-kit.ts";
import { signIn } from "../../test-database/session-test-kit.ts";

test("definition titles name a built-in definition and nothing else", async () => {
  await signIn(await testUser());
  expect(
    await constructMetadata({
      params: Promise.resolve({ constructId: "lumen" }),
      searchParams: Promise.resolve({}),
    }),
  ).toEqual({ title: `${getConstruct("lumen").name} · Project Buddy` });
  expect(
    await constructMetadata({
      params: Promise.resolve({ constructId: crypto.randomUUID() }),
      searchParams: Promise.resolve({}),
    }),
  ).toEqual({ title: "Construct · Project Buddy" });
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
});
