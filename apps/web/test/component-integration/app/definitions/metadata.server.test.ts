import { expect, test } from "vitest";
import { generateMetadata as constructMetadata } from "@/app/(site)/(workspace)/constructs/[constructId]/page.tsx";

import { getConstruct } from "@/constructs/index.ts";
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
});
