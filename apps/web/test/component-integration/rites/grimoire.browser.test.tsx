import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import GrimoirePage from "@/app/(workspace)/grimoire/page.tsx";
import { BUILT_IN_RITES } from "@/rites/rite.ts";
import { listRites } from "@/rites/rite-store.ts";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

test("use_case_grimoire_page", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listRites).mockResolvedValueOnce([...BUILT_IN_RITES]);
  await render(
    await GrimoirePage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ filter: "built-in", q: "capt" }),
    }),
  );
  await expect
    .element(page.getByRole("searchbox", { name: "Search rites" }))
    .toHaveValue("capt");
  await expect
    .element(page.getByRole("link", { name: "Create rite" }))
    .toHaveAttribute("href", "/grimoire/new");
  await expect
    .element(page.getByRole("link", { name: "View" }))
    .toHaveAttribute("href", "/grimoire/capture");
  await expect
    .element(page.getByRole("heading", { name: "Brainstorm" }))
    .not.toBeInTheDocument();
});

test("use_case_view_retirement", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listRites).mockResolvedValueOnce([
    { id: crypto.randomUUID(), name: "Forgotten rite", source: "own", replies: ["Reply"], forgotten: true },
  ]);
  await render(await GrimoirePage({ params: Promise.resolve({}), searchParams: Promise.resolve({ filter: "forgotten" }) }));
  await expect.element(page.getByRole("heading", { name: "Forgotten rite" })).toBeVisible();
  expect(listRites).toHaveBeenLastCalledWith(SIGNED_IN_USER.id, true);
});
