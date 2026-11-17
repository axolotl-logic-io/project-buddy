import { expect, test } from "vitest";
import WorkshopRedirect from "@/app/(workspace)/workshop/page.tsx";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";

test("old Workshop bookmarks reach the standalone Spellbook", async () => {
  await expect(
    expectRedirect(WorkshopRedirect, "/spellbook"),
  ).resolves.toBeUndefined();
});
