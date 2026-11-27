import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import RitePage from "@/app/(site)/(workspace)/grimoire/[riteId]/page.tsx";
import GrimoirePage from "@/app/(site)/(workspace)/grimoire/page.tsx";
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

vi.mock("next/navigation", () => import("../components/router-test-kit.ts"));
vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

// Noon UTC, so the day is the same in every zone the tests run in.
const ACTIVE_PLAN: Rite = {
  id: "0b6c3d8e-1f2a-4b5c-8d9e-0f1a2b3c4d5e",
  name: "Plan",
  source: "own",
  firstMessage: "Plan begins.",
  replies: ["First reply"],
  order: "random",
  loop: true,
  finalReply: "",
};
const PLAN: Rite = {
  ...ACTIVE_PLAN,
  forgottenAt: new Date("2026-11-20T12:00:00Z"),
};
const SKETCH: Rite = {
  id: "1c7d4e9f-2a3b-4c5d-9e0f-1a2b3c4d5e6f",
  name: "Sketch",
  source: "own",
  firstMessage: "Sketch begins.",
  replies: ["Draw it"],
  order: "random",
  loop: true,
  finalReply: "",
  forgottenAt: new Date("2026-11-18T12:00:00Z"),
};
const LONG_NAME =
  "Brainstormingwithoutanybreaksatallinthisveryverylongritename";

const PLAN_FORGOTTEN_ON = /^Forgotten Nov 20, 2026$/u;
const EMPTY_FORGOTTEN = /^You have no forgotten rites\./u;
const PLAN_RESTORED = /^“Plan” is restored/u;
const ONE_REPLY = /\b1 reply\b/u;
const LIST_MEANING = /\{list\}the list’s name/u;

type SearchParams = Record<string, string>;

// The store's answer: the active rites, or the forgotten ones.
function storeHolds(active: readonly Rite[], forgotten: readonly Rite[]): void {
  vi.mocked(listRites).mockImplementation((_user, wanted) => {
    if (wanted === true) {
      return Promise.resolve([...forgotten]);
    }
    return Promise.resolve([...active]);
  });
}

// A rite's row in the finder, by its name.
function row(name: string): ReturnType<typeof page.getByRole> {
  return page.getByRole("listitem").filter({
    has: page.getByRole("link", { name, exact: true }),
  });
}

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

describe("use_case_grimoire_page", () => {
  test("opens on the tab and search in its address, and each row opens its rite", async () => {
    storeHolds([...BUILT_IN_RITES, ACTIVE_PLAN], [SKETCH]);
    await render(
      await GrimoirePage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ filter: "built-in", q: "capt" }),
      }),
    );
    await expect
      .element(page.getByRole("searchbox", { name: "Find a rite" }))
      .toHaveValue("capt");
    await expect
      .element(page.getByRole("tab", { name: "Built-in 1" }))
      .toHaveAttribute("aria-selected", "true");
    await expect
      .element(page.getByRole("link", { name: "Capture", exact: true }))
      .toHaveAttribute("href", "/grimoire/capture");
    await expect
      .element(page.getByRole("link", { name: "Brainstorm" }))
      .not.toBeInTheDocument();
  });

  test("finds rites by name or first message as the user types, and counts each tab's matches", async () => {
    storeHolds([...BUILT_IN_RITES, ACTIVE_PLAN], [SKETCH]);
    await render(
      await GrimoirePage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    );
    const all = BUILT_IN_RITES.length + 1;
    await expect
      .element(page.getByRole("tab", { name: `All ${all}` }))
      .toHaveAttribute("aria-selected", "true");
    await expect
      .element(page.getByRole("tab", { name: "Yours 1" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("tab", { name: "Forgotten 1" }))
      .toBeVisible();
    await expect.element(row("Plan")).toMatchTextContent(ONE_REPLY);
    await expect
      .element(row("Capture").getByText("Built-in", { exact: true }))
      .toBeVisible();
    const search = page.getByRole("searchbox", { name: "Find a rite" });
    await search.fill("plan begins");
    await expect.element(row("Plan")).toBeVisible();
    await expect.element(row("Capture")).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("tab", { name: "Built-in 0" }))
      .toBeVisible();
    await page.getByRole("button", { name: "Clear the search" }).click();
    await expect.element(search).toHaveValue("");
    await expect.element(search).toHaveFocus();
    await expect.element(row("Capture")).toBeVisible();
  });

  test("sets each placeholder in a first message apart from its words", async () => {
    storeHolds([...BUILT_IN_RITES], []);
    await render(
      await GrimoirePage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ q: "capture" }),
      }),
    );
    await expect
      .element(row("Capture").getByText("{list}", { exact: true }))
      .toBeVisible();
  });

  test("Yours explains how to get a rite of one's own when there is none", async () => {
    storeHolds([...BUILT_IN_RITES], []);
    await render(
      await GrimoirePage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    );
    await page.getByRole("tab", { name: "Yours 0" }).click();
    await expect
      .element(
        page.getByText("You have no rites of your own yet.", { exact: false }),
      )
      .toBeVisible();
  });

  test("a built-in rite reads as read-only, with Make a copy and the placeholders explained", async () => {
    const [capture] = BUILT_IN_RITES;
    vi.mocked(readRite).mockResolvedValue(capture);
    await render(
      await RitePage({
        params: Promise.resolve({ riteId: "capture" }),
        searchParams: Promise.resolve({}),
      }),
    );
    await expect.element(page.getByText("Built-in rite")).toBeVisible();
    await expect.element(page.getByText("Read-only")).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Make a copy" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Forget" }))
      .not.toBeInTheDocument();
    expect(page.getByRole("textbox").elements()).toHaveLength(0);
    const legend = page.getByRole("region", { name: "Placeholders" });
    await expect.element(legend).toMatchTextContent(LIST_MEANING);
  });

  test("the user's own rite opens in the editor, with Make a copy and Forget above it", async () => {
    vi.mocked(readRite).mockResolvedValue(ACTIVE_PLAN);
    await render(
      await RitePage({
        params: Promise.resolve({ riteId: ACTIVE_PLAN.id }),
        searchParams: Promise.resolve({}),
      }),
    );
    await expect.element(page.getByText("Your rite")).toBeVisible();
    await expect
      .element(page.getByRole("textbox", { name: "Rite name" }))
      .toHaveValue("Plan");
    await expect
      .element(page.getByRole("button", { name: "Make a copy" }))
      .toBeVisible();
    await page.getByRole("button", { name: "Forget" }).click();
    await vi.waitFor(() => {
      expect(lastChange()).toEqual({ id: ACTIVE_PLAN.id, change: "forget" });
    });
  });
});

describe("use_case_reply_order", () => {
  const steps: Rite = {
    ...ACTIVE_PLAN,
    replies: ["First step", "Second step"],
    order: "ordered",
  };

  test("numbers the replies of a rite in order, and bullets them once it picks at random", async () => {
    vi.mocked(readRite).mockResolvedValue(steps);
    await render(
      await RitePage({
        params: Promise.resolve({ riteId: steps.id }),
        searchParams: Promise.resolve({}),
      }),
    );
    const replies = page.getByRole("list", { name: "Replies" });
    await expect
      .element(replies.getByText("1.", { exact: true }))
      .toBeVisible();
    await expect
      .element(replies.getByText("2.", { exact: true }))
      .toBeVisible();

    await page
      .getByRole("combobox", { name: "Reply order" })
      .selectOptions("Random, without repeats");
    await expect
      .element(replies.getByText("1.", { exact: true }))
      .not.toBeInTheDocument();
    expect(replies.getByText("•", { exact: true }).elements()).toHaveLength(
      steps.replies.length,
    );
  });

  test("a read-only rite numbers its replies in order, and shows its ending and final reply", async () => {
    const concluding: Rite = {
      ...steps,
      loop: false,
      finalReply: "That is the plan.",
      forgottenAt: new Date("2026-11-20T12:00:00Z"),
    };
    vi.mocked(readRite).mockResolvedValue(concluding);
    await render(
      await RitePage({
        params: Promise.resolve({ riteId: concluding.id }),
        searchParams: Promise.resolve({}),
      }),
    );
    const [first] = concluding.replies;
    const list = page
      .getByText(first ?? "", { exact: true })
      .element()
      .closest("ol, ul");
    expect(list?.tagName).toBe("OL");
    await expect.element(page.getByText("In order")).toBeVisible();
    await expect.element(page.getByText("Concludes")).toBeVisible();
    await expect
      .element(page.getByText(concluding.finalReply, { exact: true }))
      .toBeVisible();
  });

  test("asks for a final reply only for a rite that concludes", async () => {
    vi.mocked(readRite).mockResolvedValue(steps);
    await render(
      await RitePage({
        params: Promise.resolve({ riteId: steps.id }),
        searchParams: Promise.resolve({}),
      }),
    );
    const finalReply = page.getByRole("textbox", { name: "Final reply" });
    await expect.element(finalReply).not.toBeInTheDocument();
    await page
      .getByRole("combobox", { name: "After the last reply" })
      .selectOptions("Conclude with a final reply");
    await expect.element(finalReply).toBeVisible();
  });
});

describe("use_case_view_retirement", () => {
  test("lists forgotten rites in the order given, with the day each was forgotten and its actions", async () => {
    storeHolds([], [PLAN, SKETCH]);
    await renderForgottenTab();
    expect(listRites).toHaveBeenCalledWith(SIGNED_IN_USER.id, true);
    const names = page.getByRole("tabpanel").getByRole("link").elements();
    expect(names.map((name) => name.textContent)).toEqual(["Plan", "Sketch"]);
    const plan = row("Plan");
    await expect.element(plan.getByText(PLAN_FORGOTTEN_ON)).toBeVisible();
    await expect
      .element(plan.getByRole("link", { name: "Plan" }))
      .toHaveAttribute("href", `/grimoire/${PLAN.id}`);
    await expect
      .element(plan.getByRole("button", { name: "Restore" }))
      .toBeVisible();
    await expect
      .element(plan.getByRole("button", { name: "Delete forever" }))
      .toBeVisible();
  });

  test("searches the forgotten rites by name and explains no matches", async () => {
    storeHolds([], [PLAN, SKETCH]);
    await renderForgottenTab({ q: "sket" });
    await expect.element(row("Sketch")).toBeVisible();
    await expect.element(row("Plan")).not.toBeInTheDocument();
    await page
      .getByRole("searchbox", { name: "Find a rite" })
      .fill("nothing like it");
    await expect
      .element(page.getByText("No rites match your search."))
      .toBeVisible();
  });

  test("explains an empty Forgotten tab as copy, not a notice", async () => {
    storeHolds([], []);
    await renderForgottenTab();
    await expect.element(page.getByText(EMPTY_FORGOTTEN)).toBeVisible();
    expect(page.getByRole("status").elements()).toHaveLength(0);
    expect(page.getByRole("listitem").elements()).toHaveLength(0);
  });

  test("shows a forgotten rite's first message and replies as read-only text with its restore and delete controls", async () => {
    vi.mocked(readRite).mockResolvedValue(PLAN);
    await render(
      await RitePage({
        params: Promise.resolve({ riteId: PLAN.id }),
        searchParams: Promise.resolve({}),
      }),
    );
    await expect.element(page.getByText("Plan begins.")).toBeVisible();
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
    test(`at 320 px in ${mode} mode, names wrap beside the reply count, actions wrap beneath and the notice wraps`, async () => {
      applyTheme("parchment", mode);
      await setViewport(NARROWEST_VIEWPORT);
      const long = { ...PLAN, name: LONG_NAME };
      storeHolds([], [long]);
      vi.mocked(readRite).mockResolvedValue(long);
      await renderForgottenTab({ changed: "forget", rite: PLAN.id });
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        NARROWEST_VIEWPORT.width,
      );
      const card = row(LONG_NAME).element().getBoundingClientRect();
      const name = page
        .getByRole("link", { name: LONG_NAME })
        .element()
        .getBoundingClientRect();
      const count = row(LONG_NAME)
        .getByText("1 reply")
        .element()
        .getBoundingClientRect();
      expect(name.right).toBeLessThanOrEqual(count.left);
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
    storeHolds([], [PLAN, SKETCH]);
    await renderForgottenTab();
    await page
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: "Plan" }) })
      .getByRole("button", { name: "Restore" })
      .click();
    await vi.waitFor(() => {
      expect(lastChange()).toEqual({ id: PLAN.id, change: "restore" });
    });
  });

  test("after its card goes, a persistent notice names the restored rite and holds the focus", async () => {
    storeHolds([], [PLAN, SKETCH]);
    const view = await renderForgottenTab();
    await page.getByRole("button", { name: "Restore" }).first().click();
    storeHolds([], [SKETCH]);
    vi.mocked(readRite).mockResolvedValue(ACTIVE_PLAN);
    await view.rerender(
      await forgottenTab({ changed: "restore", rite: PLAN.id }),
    );
    const notice = page.getByRole("status");
    await expect.element(notice).toMatchTextContent(PLAN_RESTORED);
    await expect.element(notice).toHaveFocus();
    await expect.element(row("Plan")).not.toBeInTheDocument();
    expect(readRite).toHaveBeenLastCalledWith(SIGNED_IN_USER.id, PLAN.id, true);
  });

  test("a change naming no rite of the user's shows no notice", async () => {
    storeHolds([], [SKETCH]);
    vi.mocked(readRite).mockResolvedValue(undefined);
    await renderForgottenTab({ changed: "restore", rite: PLAN.id });
    await expect.element(row("Sketch")).toBeVisible();
    expect(page.getByRole("status").elements()).toHaveLength(0);
  });
});

describe("use_case_delete_retired_definition", () => {
  test("Keep forgotten cancels, and the dialog names the rite", async () => {
    storeHolds([], [PLAN, SKETCH]);
    await renderForgottenTab();
    const trigger = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: "Plan" }) })
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
    storeHolds([], [PLAN, SKETCH]);
    const view = await renderForgottenTab();
    await page
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: "Plan" }) })
      .getByRole("button", { name: "Delete forever" })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete forever" })
      .click();
    await vi.waitFor(() => {
      expect(lastChange()).toEqual({ id: PLAN.id, change: "delete" });
    });
    storeHolds([], [SKETCH]);
    await view.rerender(
      await forgottenTab({ changed: "delete", rite: PLAN.id }),
    );
    const notice = page.getByRole("status");
    await expect
      .element(notice)
      .toHaveTextContent("The rite is deleted forever.");
    await expect.element(notice).toHaveFocus();
    await expect.element(row("Plan")).not.toBeInTheDocument();
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
    storeHolds([], [SKETCH]);
    await renderForgottenTab({ changed: "unavailable" });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("This rite is unavailable.");
  });
});
