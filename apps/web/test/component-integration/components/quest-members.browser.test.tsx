import type { JSX } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { PendingQuests } from "@/components/pending-quests.tsx";
import { QuestMembers } from "@/components/quest-members.tsx";
import { QuestStatusTabs } from "@/components/quest-status-tabs.tsx";
import type { InviteState, MembershipResult } from "@/quests/membership.ts";
import type { PendingQuest, QuestPeople } from "@/quests/membership-store.ts";
import { PENDING_COPY, QUEST_MEMBERS_COPY } from "@/ui/copy/quest-members.ts";
import { questIdFixture, userIdFixture } from "../../support/id-fixtures.ts";
import { FOX_QUEST } from "../app/(workspace)/page-fixtures.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  measureTargets,
  pageScrollWidth,
  smallTargets,
} from "../touch-targets-test-kit.ts";
import {
  NARROWEST_VIEWPORT,
  PHONE_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

const REMOVE_OWNER = /remove morgan/iu;
const INVITED_BY_MORGAN = /Morgan invited you/u;
const PENDING_TAB = /^Pending/u;

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
const QUEST_A: PendingQuest = {
  questId: questIdFixture(),
  name: "Build a kite",
  invitedBy: "Morgan",
  invitedAt: new Date("2026-11-03T10:00:00Z"),
};
const QUEST_B: PendingQuest = {
  questId: questIdFixture(),
  name: "Learn the banjo",
  invitedBy: undefined,
  invitedAt: new Date("2026-11-04T10:00:00Z"),
};

const invite =
  vi.fn<(state: InviteState, form: FormData) => Promise<InviteState>>();
const remove =
  vi.fn<
    (request: { questId: string; person: string }) => Promise<MembershipResult>
  >();
const answer =
  vi.fn<
    (request: { questId: string; accept: boolean }) => Promise<MembershipResult>
  >();

beforeEach(() => {
  vi.clearAllMocks();
});

function members(viewer = OWNER.id, dailies = false): JSX.Element {
  return (
    <QuestMembers
      questId={FOX_QUEST.id}
      viewer={viewer}
      people={PEOPLE}
      dailies={dailies}
      invite={invite}
      remove={remove}
    />
  );
}

describe("a quest's Members tab", () => {
  test("lists the owner, members and invitations, and invites by email with the keyboard", async () => {
    invite.mockResolvedValue({
      kind: "done",
      message: QUEST_MEMBERS_COPY.invitedNotice("ash@example.test"),
    });
    await render(members());
    const list = page.getByRole("list", { name: QUEST_MEMBERS_COPY.listLabel });
    await expect.element(list.getByText("Morgan (you)")).toBeVisible();
    await expect
      .element(list.getByText(QUEST_MEMBERS_COPY.owner))
      .toBeVisible();
    await expect.element(list.getByText("Rae")).toBeVisible();
    await expect
      .element(list.getByText(QUEST_MEMBERS_COPY.invited))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: REMOVE_OWNER }))
      .not.toBeInTheDocument();

    await page
      .getByRole("textbox", { name: QUEST_MEMBERS_COPY.emailLabel })
      .fill("ash@example.test");
    await userEvent.keyboard("{Enter}");
    await expect
      .element(
        page.getByText(QUEST_MEMBERS_COPY.invitedNotice("ash@example.test")),
      )
      .toBeVisible();
    const [, form] = invite.mock.lastCall ?? [];
    expect(form?.get("email")).toBe("ash@example.test");
    expect(form?.get("questId")).toBe(FOX_QUEST.id);
  });

  test("removing a member asks first, and says who was removed", async () => {
    remove.mockResolvedValue({ kind: "done" });
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
    await expect
      .element(page.getByText(QUEST_MEMBERS_COPY.removed("Rae")))
      .toBeVisible();
    expect(remove).toHaveBeenCalledWith({
      questId: FOX_QUEST.id,
      person: MEMBER.id,
    });
  });

  test("a member may leave, and withdraw an invitation without confirming", async () => {
    remove.mockResolvedValue({ kind: "done" });
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
      .element(
        page.getByText(QUEST_MEMBERS_COPY.withdrawn(INVITEE.displayName)),
      )
      .toBeVisible();
  });

  test("Dailies offers no invitations", async () => {
    await render(members(OWNER.id, true));
    await expect
      .element(page.getByText(QUEST_MEMBERS_COPY.dailies))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("textbox", { name: QUEST_MEMBERS_COPY.emailLabel }),
      )
      .not.toBeInTheDocument();
  });
});

describe("Pending on Quests", () => {
  test("accepting one invitation with the keyboard leaves the other pending and links to the quest", async () => {
    answer.mockResolvedValue({ kind: "done" });
    await render(
      <QuestStatusTabs
        quests={[]}
        initialStatus="pending"
        pending={{ quests: [QUEST_A, QUEST_B], answer }}
      />,
    );
    await expect
      .element(page.getByRole("tab", { name: PENDING_TAB }))
      .toHaveAttribute("aria-selected", "true");
    await expect.element(page.getByText(INVITED_BY_MORGAN)).toBeVisible();
    page
      .getByRole("button", { name: PENDING_COPY.acceptLabel(QUEST_A.name) })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");

    await expect
      .element(
        page
          .getByRole("status")
          .filter({ hasText: PENDING_COPY.accepted(QUEST_A.name) }),
      )
      .toBeVisible();
    await expect
      .element(
        page.getByRole("link", { name: PENDING_COPY.open(QUEST_A.name) }),
      )
      .toHaveAttribute("href", `/quests/${QUEST_A.questId}`);
    await expect
      .element(
        page.getByRole("button", {
          name: PENDING_COPY.acceptLabel(QUEST_B.name),
        }),
      )
      .toBeVisible();
    expect(answer).toHaveBeenCalledWith({
      questId: QUEST_A.questId,
      accept: true,
    });
  });

  test("an invitation already answered elsewhere says so", async () => {
    answer.mockResolvedValue({ kind: "failed" });
    await render(<PendingQuests quests={[QUEST_B]} answer={answer} />);
    await page
      .getByRole("button", { name: PENDING_COPY.declineLabel(QUEST_B.name) })
      .click();
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(PENDING_COPY.failed);
  });
});

describe("members and Pending on phones", () => {
  for (const viewport of [NARROWEST_VIEWPORT, PHONE_VIEWPORT]) {
    for (const mode of ["light", "dark"]) {
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
        await view.rerender(
          <QuestStatusTabs
            quests={[]}
            initialStatus="pending"
            pending={{ quests: [QUEST_A, QUEST_B], answer }}
          />,
        );
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
});
