// The owner's invite form and pending invitations on a project's page, in
// Chromium and WebKit. "use_case_invite_to_project": the form sends the
// project and the address, gives its answer, and shows a
// refusal at the field, which keeps the address; each pending invitation
// has a Revoke button named for its address. What the actions save is
// project-invitations.server.test.ts's.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  inviteToProjectAction,
  revokeProjectInvitationAction,
} from "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts";
import { ProjectInvite } from "@/app/(workspace)/projects/[projectId]/(overview)/project-invite.tsx";
import { PROJECT_INVITE_COPY } from "@/ui/copy/project-invitations.ts";
import { projectInvitationIdFixture } from "../../../../../support/id-fixtures.ts";
import {
  paintOf,
  tokenColor,
} from "../../../../components/ui/button-fill-test-kit.ts";
import { SENT_INVITATION } from "../../../../projects/project-invitations-test-kit.ts";
import { applyTheme } from "../../../../themes/theme-test-kit.ts";
import { FOX_PROJECT } from "../../page-fixtures.ts";

const actions = vi.hoisted(() => ({
  inviteToProjectAction: vi.fn<typeof inviteToProjectAction>(),
  revokeProjectInvitationAction: vi.fn<typeof revokeProjectInvitationAction>(),
}));
vi.mock(
  "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts",
  () => actions,
);

const ADDRESS = "alex@example.com";

function emailField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: PROJECT_INVITE_COPY.emailLabel });
}

function sendButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: PROJECT_INVITE_COPY.send });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_invite_to_project", () => {
  test("sends the project and the address from the keyboard alone, and says it's sent", async () => {
    actions.inviteToProjectAction.mockResolvedValue({
      kind: "sent",
      message: PROJECT_INVITE_COPY.sent(ADDRESS),
      email: ADDRESS,
    });
    const screen = await render(
      <ProjectInvite invitations={[]} projectId={FOX_PROJECT.id} />,
    );

    await expect
      .element(page.getByRole("region", { name: PROJECT_INVITE_COPY.heading }))
      .toBeVisible();
    await expect
      .element(page.getByText(PROJECT_INVITE_COPY.nonePending))
      .toBeVisible();
    emailField().element().focus();
    await userEvent.keyboard(ADDRESS);
    await userEvent.keyboard("{Enter}");

    await expect
      .element(
        page
          .getByRole("status")
          .filter({ hasText: PROJECT_INVITE_COPY.sent(ADDRESS) }),
      )
      .toHaveTextContent(PROJECT_INVITE_COPY.sent(ADDRESS));
    await expect.element(emailField()).toHaveFocus();
    await screen.rerender(
      <ProjectInvite
        invitations={[SENT_INVITATION]}
        projectId={FOX_PROJECT.id}
      />,
    );
    await expect
      .element(
        page
          .getByRole("status")
          .filter({ hasText: PROJECT_INVITE_COPY.sent(ADDRESS) }),
      )
      .toHaveTextContent(PROJECT_INVITE_COPY.sent(ADDRESS));
    await screen.rerender(
      <ProjectInvite
        invitations={[
          {
            ...SENT_INVITATION,
            id: projectInvitationIdFixture(
              "5d6e7f8a-9b0c-4d1e-8f2a-3b4c5d6e7f8a",
            ),
          },
        ]}
        projectId={FOX_PROJECT.id}
      />,
    );
    await expect
      .element(
        page
          .getByRole("status")
          .filter({ hasText: PROJECT_INVITE_COPY.sent(ADDRESS) }),
      )
      .toHaveTextContent(PROJECT_INVITE_COPY.sent(ADDRESS));
    await screen.rerender(
      <ProjectInvite invitations={[]} projectId={FOX_PROJECT.id} />,
    );
    await expect
      .element(
        page.getByText(PROJECT_INVITE_COPY.revoked(SENT_INVITATION.email)),
      )
      .toHaveFocus();
    const [, sent] = actions.inviteToProjectAction.mock.lastCall ?? [];
    expect(sent?.get("projectId")).toBe(FOX_PROJECT.id);
    expect(sent?.get("email")).toBe(ADDRESS);
  });

  test("a member's address is refused at the field, which keeps it", async () => {
    const message = PROJECT_INVITE_COPY.alreadyMember(ADDRESS);
    actions.inviteToProjectAction.mockResolvedValue({
      kind: "invalid",
      field: "email",
      message,
      email: ADDRESS,
    });
    await render(<ProjectInvite invitations={[]} projectId={FOX_PROJECT.id} />);

    await emailField().fill(ADDRESS);
    await sendButton().click();

    await expect.element(emailField()).toHaveAttribute("aria-invalid", "true");
    await expect
      .element(emailField())
      .toHaveAccessibleDescription(expect.stringContaining(message));
    await expect.element(emailField()).toHaveValue(ADDRESS);
  });

  test("lists each pending invitation with a Revoke button named for its address", async () => {
    applyTheme("parchment");
    const screen = await render(
      <ProjectInvite
        invitations={[SENT_INVITATION]}
        projectId={FOX_PROJECT.id}
      />,
    );

    const list = page.getByRole("list", {
      name: PROJECT_INVITE_COPY.pendingHeading,
    });
    await expect.element(list.getByText(SENT_INVITATION.email)).toBeVisible();
    const revoke = page.getByRole("button", {
      name: PROJECT_INVITE_COPY.revokeLabel(SENT_INVITATION.email),
    });
    await revoke.click();

    const dialog = page.getByRole("alertdialog");
    await expect.element(dialog).toBeVisible();
    expect(actions.revokeProjectInvitationAction).not.toHaveBeenCalled();
    await dialog
      .getByRole("button", { name: PROJECT_INVITE_COPY.keepInvitation })
      .click();
    expect(actions.revokeProjectInvitationAction).not.toHaveBeenCalled();
    await revoke.click();
    const confirm = dialog.getByRole("button", {
      name: PROJECT_INVITE_COPY.revoke,
      exact: true,
    });
    expect(paintOf(confirm.element()).fill).toBe(tokenColor("danger"));
    await confirm.click();
    await screen.rerender(
      <ProjectInvite invitations={[]} projectId={FOX_PROJECT.id} />,
    );
    await expect
      .element(
        page.getByText(PROJECT_INVITE_COPY.revoked(SENT_INVITATION.email)),
      )
      .toHaveFocus();
    const [sent] = actions.revokeProjectInvitationAction.mock.lastCall ?? [];
    expect(sent?.get("invitationId")).toBe(SENT_INVITATION.id);
  });
});
