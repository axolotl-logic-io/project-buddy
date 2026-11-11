import { test } from "vitest";
import ConstructsPage from "@/app/(workspace)/constructs/page.tsx";
import SpellbookPage from "@/app/(workspace)/spellbook/page.tsx";
import { workshopPath } from "@/routes.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";

// Collection bookmarks retain retirement feedback, but never propagate arbitrary
// query text into the destination. Detail and editor URLs remain in place.
test.each([
  { kind: "construct", page: ConstructsPage },
  { kind: "spell", page: SpellbookPage },
] as const)(
  "the former $kind collection opens Workshop",
  async ({ kind, page }) => {
    await expectRedirect(
      () =>
        page({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({ name: "Private definition" }),
        }),
      workshopPath(kind),
    );
    const destination = new URL(
      workshopPath(kind),
      "https://project-buddy.example",
    );
    destination.searchParams.set("retired", "1");
    await expectRedirect(
      () =>
        page({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({ retired: "1" }),
        }),
      `${destination.pathname}${destination.search}`,
    );
  },
);
