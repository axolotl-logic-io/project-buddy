import type { JSX } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import type { MembershipResult } from "@/quests/membership.ts";
import {
  inviteToQuestAction,
  removeFromQuestAction,
} from "@/quests/membership-actions.ts";
import type { PendingQuest, QuestPeople } from "@/quests/membership-store.ts";
import { THEME_MODES } from "@/themes/themes.ts";
import { PANEL_COMMANDS_COPY } from "@/ui/copy/commands.ts";
import { PENDING_COPY, QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { animationsSettled } from "../../support/animations-test-kit.ts";
import { questIdFixture, userIdFixture } from "../../support/id-fixtures.ts";
import { tabForward } from "../../support/keyboard-test-kit.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../touch-targets-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
  type ViewportSize,
} from "../viewports-test-kit.ts";
import { QuestSidebar } from "./quest-panel-test-kit.tsx";

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

const notes: typeof PANEL_COMMANDS_COPY.notes = PANEL_COMMANDS_COPY.notes;

const REMOVE_OWNER = /remove morgan/iu;
const INVITED_BY_MORGAN = /Morgan invited you/u;
const WORD_BREAK_NAME = "Thursday bread in Portuguese with neighbours";

const OWNER = { id: userIdFixture(), displayName: "Morgan" };
const MEMBER = { id: userIdFixture(), displayName: "Rae" };
const INVITEE = {
  id: userIdFixture(),
  displayName: "a-very-long-address-for-a-phone@example.test",
};
const PEOPLE: QuestPeople = {
  owner: OWNER,
  members: [{ ...MEMBER, joinedAt: new Date("2026-11-01T10:00:00Z") }],
  invited: [{ ...INVITEE, invitedAt: new Date("2026-11-02T10:00:00Z") }],
};
// A tablet's screen, where the quest sidebar is still a drawer, and a
// common phone's.
const TABLET_VIEWPORT: ViewportSize = { width: 768, height: 1024 };
const SMALL_PHONE_VIEWPORT: ViewportSize = { width: 360, height: 780 };
const SIDEBAR_LABEL = "Quest side menu";
const CONVERSATION = "Conversation";

const QUEST_A: PendingQuest = {
  questId: questIdFixture(),
  name: "Build a kite",
  status: "active",
  invitedBy: "Morgan",
  invitedAt: new Date("2026-11-03T10:00:00Z"),
};
const QUEST_B: PendingQuest = {
  questId: questIdFixture(),
  name: "Learn the banjo",
  status: "completed",
  invitedBy: undefined,
  invitedAt: new Date("2026-11-04T10:00:00Z"),
};

const QUEST_ID = questIdFixture();
const invite = vi.mocked(inviteToQuestAction);
const remove = vi.mocked(removeFromQuestAction);
const answer =
  vi.fn<
    (request: { questId: string; accept: boolean }) => Promise<MembershipResult>
  >();

beforeEach(() => {
  vi.clearAllMocks();
  invite.mockResolvedValue({ kind: "saved" });
  remove.mockResolvedValue({ kind: "saved" });
});

function members(viewer = OWNER.id, dailies = false): JSX.Element {
  return (
    <QuestMembers
      viewer={viewer}
      people={PEOPLE}
      quest={{ id: QUEST_ID, name: "Fox project", dailies }}
    />
  );
}

// The quest sidebar as the quest page shows it, holding the Members tab
// for viewer, opened on Members: a drawer below 1024 px.
function sidebarMembers(viewer = OWNER.id): JSX.Element {
  return (
    <QuestSidebar
      initialSection="members"
      sideSections={[
        { id: "members", label: "Members", content: members(viewer) },
      ]}
    >
      <p>{CONVERSATION}</p>
    </QuestSidebar>
  );
}

// Once the page's animations, such as a dialog's pop-in, have finished.
async function animationsDone(): Promise<void> {
  await animationsSettled(document, "The page");
}

// The element the browser would hit at the middle of the element: what a
// tap or a click there would reach.
function hitAtMiddle(element: Element): Element | null {
  const box = element.getBoundingClientRect();
  return document.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  );
}

function pendingTabs(quests: readonly PendingQuest[]): JSX.Element {
  return (
    <QuestStatusTabs
      quests={[]}
      initialStatus="pending"
      pending={{ quests, answer }}
    />
  );
}

describe("a quest's Members tab", () => {
  test("lists the owner, members and invitations by address, and invites by email with the keyboard", async () => {
    invite.mockResolvedValue({
      kind: "saved",
      message: notes.invited("ash@example.test"),
    });
    await render(members());
    const list = page.getByRole("list", { name: QUEST_MEMBERS_COPY.listLabel });
    await expect.element(list.getByText("Morgan (you)")).toBeVisible();
    await expect
      .element(list.getByText(QUEST_MEMBERS_COPY.owner))
      .toBeVisible();
    await expect.element(list.getByText("Rae")).toBeVisible();
    await expect.element(list.getByText(INVITEE.displayName)).toBeVisible();
    await expect
      .element(list.getByText(QUEST_MEMBERS_COPY.invited))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", {
          name: QUEST_MEMBERS_COPY.withdrawLabel(INVITEE.displayName),
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: REMOVE_OWNER }))
      .not.toBeInTheDocument();

    const email = page.getByRole("textbox", {
      name: QUEST_MEMBERS_COPY.emailLabel,
    });
    expect(email.element().getBoundingClientRect().bottom).toBeLessThan(
      list.element().getBoundingClientRect().top,
    );
    const [owner, member, invited] = list.getByRole("listitem").elements();
    expect(owner?.textContent).toContain("Morgan (you)");
    expect(member?.textContent).toContain("Rae");
    expect(invited?.textContent).toContain(INVITEE.displayName);
    await email.fill("ash@example.test");
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByText(notes.invited("ash@example.test")))
      .toBeVisible();
    await expect.element(email).toHaveValue("");
    expect(invite).toHaveBeenCalledWith({
      questId: QUEST_ID,
      email: "ash@example.test",
    });
  });

  test("after Invite is clicked, focus returns to the address, which a refused invitation keeps", async () => {
    invite.mockResolvedValue({
      kind: "problem",
      text: QUEST_MEMBERS_COPY.limited,
    });
    await render(members());
    const email = page.getByRole("textbox", {
      name: QUEST_MEMBERS_COPY.emailLabel,
    });
    await email.fill("ash@example.test");
    await page.getByRole("button", { name: QUEST_MEMBERS_COPY.invite }).click();

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(QUEST_MEMBERS_COPY.limited);
    await expect.element(email).toHaveValue("ash@example.test");
    await expect.element(email).toHaveFocus();

    invite.mockResolvedValue({
      kind: "problem",
      text: QUEST_MEMBERS_COPY.inQuest("rae@example.test"),
    });
    await email.fill("rae@example.test");
    await page.getByRole("button", { name: QUEST_MEMBERS_COPY.invite }).click();
    await expect
      .element(page.getByText(QUEST_MEMBERS_COPY.inQuest("rae@example.test")))
      .toBeVisible();
    await expect.element(email).toHaveValue("rae@example.test");
    await expect.element(email).toHaveFocus();

    invite.mockResolvedValue({
      kind: "saved",
      message: notes.invited("rae@example.test"),
    });
    await page.getByRole("button", { name: QUEST_MEMBERS_COPY.invite }).click();
    await expect
      .element(page.getByText(notes.invited("rae@example.test")))
      .toBeVisible();
    await expect.element(email).toHaveValue("");
    await expect.element(email).toHaveFocus();
  });

  test("removing a member asks first and reports success", async () => {
    remove.mockResolvedValue({ kind: "saved", message: notes.removed("Rae") });
    await render(members());
    await page
      .getByRole("button", { name: QUEST_MEMBERS_COPY.removeLabel("Rae") })
      .click();
    await expect
      .element(
        page
          .getByRole("alertdialog")
          .getByText(QUEST_MEMBERS_COPY.removeConfirm("Rae")),
      )
      .toBeVisible();
    expect(remove).not.toHaveBeenCalled();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: QUEST_MEMBERS_COPY.remove })
      .click();
    await expect.element(page.getByText(notes.removed("Rae"))).toBeVisible();
    expect(remove).toHaveBeenCalledWith({
      questId: QUEST_ID,
      person: MEMBER.id,
    });
  });

  test("a member may withdraw an invitation without confirming, and focus stays in the tab", async () => {
    remove.mockResolvedValue({
      kind: "saved",
      message: notes.withdrawn(INVITEE.displayName),
    });
    await render(members(MEMBER.id));
    await expect
      .element(page.getByRole("button", { name: QUEST_MEMBERS_COPY.leave }))
      .toBeVisible();
    await page
      .getByRole("button", {
        name: QUEST_MEMBERS_COPY.withdrawLabel(INVITEE.displayName),
      })
      .click();
    await expect
      .element(page.getByText(notes.withdrawn(INVITEE.displayName)))
      .toBeVisible();
    expect(remove).toHaveBeenCalledWith({
      questId: QUEST_ID,
      person: INVITEE.id,
    });
    await expect
      .element(page.getByText(QUEST_MEMBERS_COPY.heading))
      .toHaveFocus();
  });

  test("leaving asks first and removes the viewer", async () => {
    await render(members(MEMBER.id));
    await page.getByRole("button", { name: QUEST_MEMBERS_COPY.leave }).click();
    expect(remove).not.toHaveBeenCalled();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: QUEST_MEMBERS_COPY.leaveConfirmButton })
      .click();
    await vi.waitFor(() =>
      expect(remove).toHaveBeenCalledWith({
        questId: QUEST_ID,
        person: MEMBER.id,
      }),
    );
  });

  test("a refused removal says why and keeps the member listed", async () => {
    remove.mockResolvedValue({
      kind: "problem",
      text: PANEL_COMMANDS_COPY.problems.awaitingReply,
    });
    await render(members());
    await page
      .getByRole("button", { name: QUEST_MEMBERS_COPY.removeLabel("Rae") })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: QUEST_MEMBERS_COPY.remove })
      .click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(PANEL_COMMANDS_COPY.problems.awaitingReply);
    await expect
      .element(
        page
          .getByRole("list", { name: QUEST_MEMBERS_COPY.listLabel })
          .getByText("Rae"),
      )
      .toBeVisible();
  });

  test("Dailies says only that it has no members", async () => {
    await render(members(OWNER.id, true));
    await expect
      .element(page.getByText(QUEST_MEMBERS_COPY.dailies))
      .toBeVisible();
    await expect
      .element(page.getByText(QUEST_MEMBERS_COPY.intro))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("list", { name: QUEST_MEMBERS_COPY.listLabel }))
      .not.toBeInTheDocument();
    await expect
      .element(
        page.getByRole("textbox", { name: QUEST_MEMBERS_COPY.emailLabel }),
      )
      .not.toBeInTheDocument();
  });
});

describe("the Members tab in the quest sidebar's drawer", () => {
  for (const viewport of [
    NARROWEST_VIEWPORT,
    SMALL_PHONE_VIEWPORT,
    PHONE_VIEWPORT,
    TABLET_VIEWPORT,
  ]) {
    test(`at ${viewport.width} px, Remove asks above the drawer, keeps focus in its question, and Cancel and Remove work by touch and keyboard`, async () => {
      remove.mockResolvedValue({
        kind: "saved",
        message: notes.removed("Rae"),
      });
      await setViewport(viewport);
      await render(sidebarMembers());
      const drawer = page.getByRole("dialog", { name: SIDEBAR_LABEL });
      await expect.element(drawer).toBeVisible();

      await drawer
        .getByRole("button", { name: QUEST_MEMBERS_COPY.removeLabel("Rae") })
        .click();
      const question = page.getByRole("alertdialog");
      await expect.element(question).toBeVisible();
      const cancel = question.getByRole("button", {
        name: QUEST_MEMBERS_COPY.removeCancel,
      });
      const confirm = question.getByRole("button", {
        name: QUEST_MEMBERS_COPY.remove,
      });
      // Shown above the drawer: a tap at its buttons reaches them.
      await animationsDone();
      expect(hitAtMiddle(cancel.element())).toBe(cancel.element());
      expect(hitAtMiddle(confirm.element())).toBe(confirm.element());
      await expect.element(cancel).toHaveFocus();
      // Three presses from Cancel end on Remove only if focus wraps
      // within the question, never reaching the drawer behind it.
      await tabForward();
      await tabForward();
      await tabForward();
      await expect.element(confirm).toHaveFocus();
      await cancel.click();
      await expect.element(question).not.toBeInTheDocument();
      await expect.element(drawer).toBeVisible();
      expect(remove).not.toHaveBeenCalled();

      await drawer
        .getByRole("button", { name: QUEST_MEMBERS_COPY.removeLabel("Rae") })
        .click();
      await expect.element(cancel).toHaveFocus();
      await tabForward();
      await expect.element(confirm).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      await expect
        .element(drawer.getByText(notes.removed("Rae")))
        .toBeVisible();
      expect(remove).toHaveBeenCalledWith({
        questId: QUEST_ID,
        person: MEMBER.id,
      });
    });
  }

  test("at 390 px, Escape and Stay in quest cancel Leave without closing the drawer, and Leave quest leaves", async () => {
    await setViewport(PHONE_VIEWPORT);
    await render(sidebarMembers(MEMBER.id));
    const drawer = page.getByRole("dialog", { name: SIDEBAR_LABEL });
    const leave = drawer.getByRole("button", {
      name: QUEST_MEMBERS_COPY.leave,
    });
    const question = page.getByRole("alertdialog");

    await leave.click();
    await expect.element(question).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(question).not.toBeInTheDocument();
    await expect.element(drawer).toBeVisible();

    await leave.click();
    const stay = question.getByRole("button", {
      name: QUEST_MEMBERS_COPY.leaveCancel,
    });
    await animationsDone();
    expect(hitAtMiddle(stay.element())).toBe(stay.element());
    await stay.click();
    await expect.element(question).not.toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();

    await leave.click();
    const confirm = question.getByRole("button", {
      name: QUEST_MEMBERS_COPY.leaveConfirmButton,
    });
    await animationsDone();
    expect(hitAtMiddle(confirm.element())).toBe(confirm.element());
    await confirm.click();
    await vi.waitFor(() =>
      expect(remove).toHaveBeenCalledWith({
        questId: QUEST_ID,
        person: MEMBER.id,
      }),
    );
  });

  test("at 1280 px the sidebar is no drawer, and Remove still asks first", async () => {
    remove.mockResolvedValue({ kind: "saved", message: notes.removed("Rae") });
    await setViewport(LAPTOP_VIEWPORT);
    await render(sidebarMembers());
    await page
      .getByRole("button", { name: QUEST_MEMBERS_COPY.removeLabel("Rae") })
      .click();
    const confirm = page
      .getByRole("alertdialog")
      .getByRole("button", { name: QUEST_MEMBERS_COPY.remove });
    await animationsDone();
    expect(hitAtMiddle(confirm.element())).toBe(confirm.element());
    await confirm.click();
    await expect.element(page.getByText(notes.removed("Rae"))).toBeVisible();
  });
});

describe("Members rows", () => {
  for (const viewport of [
    SMALL_PHONE_VIEWPORT,
    TABLET_VIEWPORT,
    LAPTOP_VIEWPORT,
  ]) {
    test(`start names at the list's edge with the control at the row's end at ${viewport.width} px`, async () => {
      await setViewport(viewport);
      await render(members());
      const list = page
        .getByRole("list", { name: QUEST_MEMBERS_COPY.listLabel })
        .element()
        .getBoundingClientRect();
      const name = page.getByText("Rae", { exact: true }).element();
      const nameBox = name.getBoundingClientRect();
      const removeBox = page
        .getByRole("button", { name: QUEST_MEMBERS_COPY.removeLabel("Rae") })
        .element()
        .getBoundingClientRect();
      expect(nameBox.left).toBe(list.left);
      expect(Math.round(removeBox.right)).toBe(Math.round(list.right));
      expect(removeBox.top).toBeLessThan(nameBox.bottom);
    });
  }
});

describe("Pending on Quests", () => {
  test("accepting one invitation with the keyboard says where the quest is now and leaves the other pending", async () => {
    answer.mockResolvedValue({ kind: "done" });
    await render(pendingTabs([QUEST_A, QUEST_B]));
    await expect
      .element(page.getByRole("tablist", { name: QUEST_STATUS_COPY.tabs }))
      .toBeVisible();
    await expect
      .element(page.getByRole("tab", { name: PENDING_COPY.tabLabel(2) }))
      .toHaveAttribute("aria-selected", "true");
    await expect.element(page.getByText(INVITED_BY_MORGAN)).toBeVisible();
    page
      .getByRole("button", { name: PENDING_COPY.acceptLabel(QUEST_A.name) })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");

    const accepted = PENDING_COPY.accepted(
      QUEST_A.name,
      QUEST_STATUS_COPY.labels.active,
    );
    await expect
      .element(page.getByRole("status").filter({ hasText: accepted }))
      .toBeVisible();
    expect(accepted).toContain("Active");
    await expect
      .element(page.getByRole("link", { name: PENDING_COPY.open }))
      .toHaveAttribute("href", `/quests/${QUEST_A.questId}`);
    await expect
      .element(
        page.getByRole("button", {
          name: PENDING_COPY.acceptLabel(QUEST_B.name),
        }),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("tab", { name: PENDING_COPY.tabLabel(1) }))
      .toBeVisible();
    expect(answer).toHaveBeenCalledWith({
      questId: QUEST_A.questId,
      accept: true,
    });
  });

  test("an invitation already answered elsewhere says so, and leaves the list and the count at once", async () => {
    answer.mockResolvedValue({ kind: "failed" });
    await render(pendingTabs([QUEST_A, QUEST_B]));
    await page
      .getByRole("button", { name: PENDING_COPY.declineLabel(QUEST_B.name) })
      .click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(PENDING_COPY.failed);
    await expect
      .element(
        page.getByRole("button", {
          name: PENDING_COPY.acceptLabel(QUEST_B.name),
        }),
      )
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("tab", { name: PENDING_COPY.tabLabel(1) }))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", {
          name: PENDING_COPY.acceptLabel(QUEST_A.name),
        }),
      )
      .toBeVisible();
  });
});

describe("members and Pending on phones", () => {
  for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
    for (const mode of THEME_MODES) {
      test(`fit ${viewport.width} px in ${mode}`, async () => {
        applyTheme("parchment", mode);
        await setViewport(viewport);
        const view = await render(members(MEMBER.id));
        await expect
          .element(
            page.getByRole("button", { name: QUEST_MEMBERS_COPY.invite }),
          )
          .toBeVisible();
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        expect(smallTargets(await measureTargets())).toEqual([]);
        await view.rerender(pendingTabs([QUEST_A, QUEST_B]));
        await expect
          .element(
            page.getByRole("button", {
              name: PENDING_COPY.acceptLabel(QUEST_A.name),
            }),
          )
          .toBeVisible();
        expect(pageScrollWidth()).toBeLessThanOrEqual(viewport.width);
        expect(smallTargets(await measureTargets())).toEqual([]);
      });
    }
  }

  for (const viewport of [NARROWEST_VIEWPORT, SMALL_PHONE_VIEWPORT]) {
    test(`at ${viewport.width} px Pending puts Accept and Decline beneath an unbroken name`, async () => {
      await setViewport(viewport);
      await render(pendingTabs([{ ...QUEST_A, name: WORD_BREAK_NAME }]));
      const title = page.getByText(WORD_BREAK_NAME).element();
      const accept = page
        .getByRole("button", {
          name: PENDING_COPY.acceptLabel(WORD_BREAK_NAME),
        })
        .element()
        .getBoundingClientRect();
      expect(accept.top).toBeGreaterThanOrEqual(
        title.getBoundingClientRect().bottom,
      );
      // Each word of the name fits on a line: none is split.
      const range = document.createRange();
      range.selectNodeContents(title);
      const lines = new Set(
        [...range.getClientRects()].map((rect) => Math.round(rect.top)),
      );
      expect(lines.size).toBeLessThanOrEqual(WORD_BREAK_NAME.split(" ").length);
      for (const word of WORD_BREAK_NAME.split(" ")) {
        const start = WORD_BREAK_NAME.indexOf(word);
        const node = title.firstChild;
        if (node === null) {
          throw new Error("The name has no text");
        }
        const wordRange = document.createRange();
        wordRange.setStart(node, start);
        wordRange.setEnd(node, start + word.length);
        const tops = new Set(
          [...wordRange.getClientRects()].map((rect) => Math.round(rect.top)),
        );
        expect(tops.size, word).toBe(1);
      }
    });
  }

  test("at 768 px Pending keeps Accept and Decline beside the name", async () => {
    await setViewport(TABLET_VIEWPORT);
    await render(pendingTabs([QUEST_A]));
    const title = page
      .getByText(QUEST_A.name)
      .element()
      .getBoundingClientRect();
    const accept = page
      .getByRole("button", { name: PENDING_COPY.acceptLabel(QUEST_A.name) })
      .element()
      .getBoundingClientRect();
    expect(accept.top).toBeLessThan(title.bottom);
    expect(accept.left).toBeGreaterThan(title.right);
  });
});
