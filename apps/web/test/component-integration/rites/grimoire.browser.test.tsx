import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import RitePage from "@/app/(workspace)/grimoire/[riteId]/page.tsx";
import GrimoirePage from "@/app/(workspace)/grimoire/page.tsx";
import { BUILT_IN_RITES, type Rite } from "@/rites/rite.ts";
import { changeRiteAction } from "@/rites/rite-actions.ts";
import { listRites, readRite } from "@/rites/rite-store.ts";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  MINIMUM_TARGET_PX,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

// Noon UTC, so the day is the same in every zone the tests run in.
const ACTIVE_PLAN: Rite = {
  id: "0b6c3d8e-1f2a-4b5c-8d9e-0f1a2b3c4d5e",
  name: "Plan",
  source: "own",
  replies: ["First reply"],
};
const PLAN: Rite = {
  ...ACTIVE_PLAN,
  forgottenAt: new Date("2026-11-20T12:00:00Z"),
};
const SKETCH: Rite = {
  id: "1c7d4e9f-2a3b-4c5d-9e0f-1a2b3c4d5e6f",
  name: "Sketch",
  source: "own",
  replies: ["Draw it"],
  forgottenAt: new Date("2026-11-18T12:00:00Z"),
};
const LONG_NAME =
  "Brainstormingwithoutanybreaksatallinthisveryverylongritename";

const PLAN_FORGOTTEN_ON = /^Forgotten Nov 20, 2026$/u;
const EMPTY_FORGOTTEN = /^You have no forgotten rites\./u;
const PLAN_RESTORED = /^“Plan” is restored/u;

type SearchParams = Record<string, string>;

async function renderForgottenTab(
  search: SearchParams = {},
): Promise<Awaited<ReturnType<typeof render>>> {
  return render(await forgottenTab(search));
}

function forgottenTab(search: SearchParams): ReturnType<typeof GrimoirePage> {
  return GrimoirePage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve({ filter: "forgotten", ...search }),
  });
}

// What the last form submitted to changeRiteAction held.
function lastChange(): Record<string, FormDataEntryValue> {
  const [form] = vi.mocked(changeRiteAction).mock.lastCall ?? [];
  if (form === undefined) {
    throw new Error("No rite change was submitted");
  }
  return Object.fromEntries(form);
}

beforeEach(() => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(changeRiteAction).mockClear();
  vi.mocked(listRites).mockReset();
  vi.mocked(readRite).mockReset();
});

afterEach(async () => {
  await setViewport(LAPTOP_VIEWPORT);
});

test("use_case_grimoire_page", async () => {
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

describe("use_case_view_retirement", () => {
  test("lists forgotten rites in the order given, with the day each was forgotten and its actions", async () => {
    vi.mocked(listRites).mockResolvedValue([PLAN, SKETCH]);
    await renderForgottenTab();
    expect(listRites).toHaveBeenLastCalledWith(SIGNED_IN_USER.id, true);
    const names = page.getByRole("heading", { level: 2 }).elements();
    expect(names.map((name) => name.textContent)).toEqual(["Plan", "Sketch"]);
    const plan = page.getByRole("listitem").filter({ hasText: "Plan" });
    await expect.element(plan.getByText(PLAN_FORGOTTEN_ON)).toBeVisible();
    await expect
      .element(plan.getByRole("link", { name: "View" }))
      .toHaveAttribute("href", `/grimoire/${PLAN.id}`);
    await expect
      .element(plan.getByRole("button", { name: "Restore" }))
      .toBeVisible();
    await expect
      .element(plan.getByRole("button", { name: "Delete forever" }))
      .toBeVisible();
  });

  test("searches the forgotten rites by name and explains no matches", async () => {
    vi.mocked(listRites).mockResolvedValue([PLAN, SKETCH]);
    await renderForgottenTab({ q: "sket" });
    await expect
      .element(page.getByRole("heading", { name: "Sketch" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: "Plan" }))
      .not.toBeInTheDocument();
    await renderForgottenTab({ q: "nothing like it" });
    await expect
      .element(page.getByText("No rites match your search."))
      .toBeVisible();
  });

  test("explains an empty Forgotten tab as copy, not a notice", async () => {
    vi.mocked(listRites).mockResolvedValue([]);
    await renderForgottenTab();
    await expect.element(page.getByText(EMPTY_FORGOTTEN)).toBeVisible();
    expect(page.getByRole("status").elements()).toHaveLength(0);
    expect(page.getByRole("listitem").elements()).toHaveLength(0);
  });

  test("shows a forgotten rite's replies as read-only text with its restore and delete controls", async () => {
    vi.mocked(readRite).mockResolvedValue(PLAN);
    await render(
      await RitePage({
        params: Promise.resolve({ riteId: PLAN.id }),
        searchParams: Promise.resolve({}),
      }),
    );
    await expect.element(page.getByText("First reply")).toBeVisible();
    expect(page.getByRole("textbox").elements()).toHaveLength(0);
    await expect
      .element(page.getByRole("button", { name: "Restore" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Delete forever" }))
      .toBeVisible();
  });

  for (const mode of ["light", "dark"]) {
    test(`at 320 px in ${mode} mode, names take the card's width, actions wrap beneath and the notice wraps`, async () => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
      const long = { ...PLAN, name: LONG_NAME };
      vi.mocked(listRites).mockResolvedValue([long]);
      vi.mocked(readRite).mockResolvedValue(long);
      await renderForgottenTab({ changed: "forget", rite: PLAN.id });
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
      const card = page.getByRole("listitem").element().getBoundingClientRect();
      const name = page
        .getByRole("heading", { name: LONG_NAME })
        .element()
        .getBoundingClientRect();
      const view = page
        .getByRole("link", { name: "View" })
        .element()
        .getBoundingClientRect();
      expect(name.right).toBeLessThanOrEqual(card.right);
      expect(name.width).toBeGreaterThan(card.width / 2);
      expect(view.top).toBeGreaterThanOrEqual(name.bottom);
      for (const action of ["Restore", "Delete forever"]) {
        const box = page
          .getByRole("button", { name: action })
          .element()
          .getBoundingClientRect();
        expect(box.top).toBeGreaterThanOrEqual(name.bottom);
        expect(box.right).toBeLessThanOrEqual(card.right);
        expect(box.height).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX);
      }
      const notice = page.getByRole("status").element().getBoundingClientRect();
      expect(notice.right).toBeLessThanOrEqual(NARROWEST_VIEWPORT.width);
    });
  }
});

describe("use_case_restore_retired_definition", () => {
  test("Restore on a card submits the rite's restoration", async () => {
    vi.mocked(listRites).mockResolvedValue([PLAN, SKETCH]);
    await renderForgottenTab();
    await page
      .getByRole("listitem")
      .filter({ hasText: "Plan" })
      .getByRole("button", { name: "Restore" })
      .click();
    await vi.waitFor(() => {
      expect(lastChange()).toEqual({ id: PLAN.id, change: "restore" });
    });
  });

  test("after its card goes, a persistent notice names the restored rite and holds the focus", async () => {
    vi.mocked(listRites).mockResolvedValue([PLAN, SKETCH]);
    const view = await renderForgottenTab();
    await page.getByRole("button", { name: "Restore" }).first().click();
    vi.mocked(listRites).mockResolvedValue([SKETCH]);
    vi.mocked(readRite).mockResolvedValue(ACTIVE_PLAN);
    await view.rerender(
      await forgottenTab({ changed: "restore", rite: PLAN.id }),
    );
    const notice = page.getByRole("status");
    await expect.element(notice).toMatchTextContent(PLAN_RESTORED);
    await expect.element(notice).toHaveFocus();
    await expect
      .element(page.getByRole("heading", { name: "Plan" }))
      .not.toBeInTheDocument();
    expect(readRite).toHaveBeenLastCalledWith(SIGNED_IN_USER.id, PLAN.id, true);
  });

  test("a change naming no rite of the user's shows no notice", async () => {
    vi.mocked(listRites).mockResolvedValue([SKETCH]);
    vi.mocked(readRite).mockResolvedValue(undefined);
    await renderForgottenTab({ changed: "restore", rite: PLAN.id });
    await expect
      .element(page.getByRole("heading", { name: "Sketch" }))
      .toBeVisible();
    expect(page.getByRole("status").elements()).toHaveLength(0);
  });
});

describe("use_case_delete_retired_definition", () => {
  test("Keep forgotten cancels, and the dialog names the rite", async () => {
    vi.mocked(listRites).mockResolvedValue([PLAN, SKETCH]);
    await renderForgottenTab();
    const trigger = page
      .getByRole("listitem")
      .filter({ hasText: "Plan" })
      .getByRole("button", { name: "Delete forever" });
    await trigger.click();
    const dialog = page.getByRole("alertdialog");
    await expect
      .element(dialog.getByRole("heading"))
      .toHaveTextContent("Delete “Plan” forever?");
    await dialog.getByRole("button", { name: "Keep forgotten" }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
    expect(changeRiteAction).not.toHaveBeenCalled();
  });

  test("confirming submits the deletion, and the notice holds the focus once the card goes", async () => {
    vi.mocked(listRites).mockResolvedValue([PLAN, SKETCH]);
    const view = await renderForgottenTab();
    await page
      .getByRole("listitem")
      .filter({ hasText: "Plan" })
      .getByRole("button", { name: "Delete forever" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete forever" })
      .click();
    await vi.waitFor(() => {
      expect(lastChange()).toEqual({ id: PLAN.id, change: "delete" });
    });
    vi.mocked(listRites).mockResolvedValue([SKETCH]);
    await view.rerender(
      await forgottenTab({ changed: "delete", rite: PLAN.id }),
    );
    const notice = page.getByRole("status");
    await expect
      .element(notice)
      .toHaveTextContent("The rite is deleted forever.");
    await expect.element(notice).toHaveFocus();
    await expect
      .element(page.getByRole("heading", { name: "Plan" }))
      .not.toBeInTheDocument();
  });

  test("the read-only view asks before deleting, and Keep forgotten keeps the rite", async () => {
    vi.mocked(readRite).mockResolvedValue(PLAN);
    await render(
      await RitePage({
        params: Promise.resolve({ riteId: PLAN.id }),
        searchParams: Promise.resolve({}),
      }),
    );
    await page.getByRole("button", { name: "Delete forever" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect
      .element(dialog.getByRole("heading"))
      .toHaveTextContent("Delete “Plan” forever?");
    await dialog.getByRole("button", { name: "Keep forgotten" }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    expect(changeRiteAction).not.toHaveBeenCalled();
    await page.getByRole("button", { name: "Delete forever" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete forever" })
      .click();
    await vi.waitFor(() => {
      expect(lastChange()).toEqual({ id: PLAN.id, change: "delete" });
    });
  });

  test("a refused change says the rite is unavailable", async () => {
    vi.mocked(listRites).mockResolvedValue([SKETCH]);
    await renderForgottenTab({ changed: "unavailable" });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("This rite is unavailable.");
  });
});
