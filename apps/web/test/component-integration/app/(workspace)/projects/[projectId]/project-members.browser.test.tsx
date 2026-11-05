// A team project's Members section in Chromium and WebKit: its owner and
// members, the owner's Remove buttons and a member's Leave project. Each
// takes effect only once confirmed. Who can remove and leave, and what that
// ends, is team-project-access.server.test.ts's.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  leaveProjectAction,
  removeMemberAction,
} from "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts";
import { ProjectMembers } from "@/app/(workspace)/projects/[projectId]/(overview)/project-members.tsx";
import { PROJECT_MEMBERS_COPY } from "@/ui/copy/projects.ts";
import { tabForward } from "../../../../components/keyboard-test-kit.ts";
import { FOX_MEMBER, FOX_OWNER, FOX_PROJECT } from "../../page-fixtures.ts";

const actions = vi.hoisted(() => ({
  removeMemberAction: vi.fn<typeof removeMemberAction>(),
  leaveProjectAction: vi.fn<typeof leaveProjectAction>(),
}));
vi.mock(
  "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts",
  () => actions,
);

// The section as its owner sees it.
const AS_OWNER = {
  projectId: FOX_PROJECT.id,
  members: [FOX_OWNER, FOX_MEMBER],
  viewer: FOX_OWNER.id,
} as const;

// The section as its member sees it.
const AS_MEMBER = { ...AS_OWNER, viewer: FOX_MEMBER.id } as const;

function rows(): ReturnType<typeof page.getByRole> {
  return page
    .getByRole("list", { name: PROJECT_MEMBERS_COPY.heading })
    .getByRole("listitem");
}

function removeButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", {
    name: PROJECT_MEMBERS_COPY.removeLabel("Alex"),
  });
}

function leaveButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: PROJECT_MEMBERS_COPY.leave });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_team_project_access", () => {
  test("lists the owner, then the members, each with their role", async () => {
    await render(<ProjectMembers {...AS_OWNER} />);

    await expect
      .element(rows().nth(0))
      .toMatchTextContent(PROJECT_MEMBERS_COPY.you(FOX_OWNER.email ?? ""));
    await expect
      .element(rows().nth(0))
      .toMatchTextContent(PROJECT_MEMBERS_COPY.owner);
    await expect.element(rows().nth(1)).toMatchTextContent("Alex");
    await expect
      .element(rows().nth(1))
      .toMatchTextContent(FOX_MEMBER.email ?? "");
    await expect
      .element(rows().nth(1))
      .toMatchTextContent(PROJECT_MEMBERS_COPY.member);
  });
});

describe("use_case_remove_member", () => {
  test("the owner removes a member once they confirm, and focus moves to the heading", async () => {
    actions.removeMemberAction.mockResolvedValue(undefined);
    const screen = await render(<ProjectMembers {...AS_OWNER} />);
    await expect.element(leaveButton()).not.toBeInTheDocument();

    await removeButton().click();
    const dialog = page.getByRole("alertdialog", {
      name: PROJECT_MEMBERS_COPY.removeTitle,
    });
    await expect
      .element(dialog)
      .toMatchTextContent(PROJECT_MEMBERS_COPY.removeDescription("Alex"));
    await page
      .getByRole("button", { name: PROJECT_MEMBERS_COPY.removeCancel })
      .click();
    expect(actions.removeMemberAction).not.toHaveBeenCalled();

    await removeButton().click();
    await page
      .getByRole("button", { name: PROJECT_MEMBERS_COPY.removeConfirm })
      .click();
    await vi.waitFor(() => {
      expect(actions.removeMemberAction).toHaveBeenCalledOnce();
    });
    const [sent] = actions.removeMemberAction.mock.lastCall ?? [];
    expect(sent?.get("projectId")).toBe(FOX_PROJECT.id);
    expect(sent?.get("memberId")).toBe(FOX_MEMBER.id);

    await screen.rerender(
      <ProjectMembers {...AS_OWNER} members={[FOX_OWNER]} />,
    );
    await expect.element(removeButton()).not.toBeInTheDocument();
    await expect
      .element(
        page.getByRole("heading", { name: PROJECT_MEMBERS_COPY.heading }),
      )
      .toHaveFocus();
    await expect
      .element(page.getByText(PROJECT_MEMBERS_COPY.alone))
      .toBeVisible();
  });
});

describe("use_case_leave_project", () => {
  test("a member leaves once they confirm, from the keyboard", async () => {
    // Leaving redirects, so the action never resolves.
    actions.leaveProjectAction.mockReturnValue(
      new Promise<never>(() => {
        // Never settles.
      }),
    );
    await render(<ProjectMembers {...AS_MEMBER} />);
    await expect.element(removeButton()).not.toBeInTheDocument();

    leaveButton().element().focus();
    await userEvent.keyboard("{Enter}");
    const dialog = page.getByRole("alertdialog", {
      name: PROJECT_MEMBERS_COPY.leaveTitle,
    });
    await expect.element(dialog).toBeVisible();
    await expect
      .element(
        page.getByRole("button", { name: PROJECT_MEMBERS_COPY.leaveCancel }),
      )
      .toHaveFocus();
    await tabForward();
    await expect
      .element(
        dialog.getByRole("button", { name: PROJECT_MEMBERS_COPY.leaveConfirm }),
      )
      .toHaveFocus();
    await userEvent.keyboard("{Enter}");

    await vi.waitFor(() => {
      expect(actions.leaveProjectAction).toHaveBeenCalledOnce();
    });
    const [sent] = actions.leaveProjectAction.mock.lastCall ?? [];
    expect(sent?.get("projectId")).toBe(FOX_PROJECT.id);
  });
});
