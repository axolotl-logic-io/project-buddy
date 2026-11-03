// The invitee's pending project invitations on the Projects page, in
// Chromium and WebKit. "use_case_join_project" and
// "use_case_decline_project_invitation": each invitation says who invited
// her to which project, with Join and Decline buttons named for the project,
// which send the invitation's id and work from the keyboard. What the
// actions save is project-invitations.server.test.ts's.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  declineProjectInvitationAction,
  joinProjectAction,
} from "@/app/(workspace)/projects/invitations/actions.ts";
import { ProjectInvitationList } from "@/components/project-invitation-list.tsx";
import { PROJECT_INVITATION_COPY } from "@/ui/copy/project-invitations.ts";
import { LONG_NAME_INVITATION } from "../projects/project-invitations-test-kit.ts";

const actions = vi.hoisted(() => ({
  joinProjectAction: vi.fn<typeof joinProjectAction>(),
  declineProjectInvitationAction:
    vi.fn<typeof declineProjectInvitationAction>(),
}));
vi.mock("@/app/(workspace)/projects/invitations/actions.ts", () => actions);

const PROJECT: string = LONG_NAME_INVITATION.project.name;

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_join_project", () => {
  test("lists the invitation under its heading, and Join sends it from the keyboard", async () => {
    await render(
      <ProjectInvitationList invitations={[LONG_NAME_INVITATION]} />,
    );

    const region = page.getByRole("region", {
      name: PROJECT_INVITATION_COPY.listHeading,
    });
    await expect
      .element(
        region.getByRole("heading", {
          name: PROJECT_INVITATION_COPY.question(PROJECT),
        }),
      )
      .toBeVisible();
    await expect
      .element(
        region.getByText(
          PROJECT_INVITATION_COPY.from(LONG_NAME_INVITATION.inviter),
          { exact: false },
        ),
      )
      .toBeVisible();
    page
      .getByRole("button", { name: PROJECT_INVITATION_COPY.joinLabel(PROJECT) })
      .element()
      .focus();
    await userEvent.keyboard("{Enter}");

    await vi.waitFor(() => {
      expect(actions.joinProjectAction).toHaveBeenCalledOnce();
    });
    const [sent] = actions.joinProjectAction.mock.lastCall ?? [];
    expect(sent?.get("invitationId")).toBe(LONG_NAME_INVITATION.id);
  });

  test("with no invitations, shows nothing", async () => {
    const { container } = await render(
      <ProjectInvitationList invitations={[]} />,
    );

    expect(container.textContent).toBe("");
  });
});

describe("use_case_decline_project_invitation", () => {
  test("Decline, named for the project, sends the invitation", async () => {
    await render(
      <ProjectInvitationList invitations={[LONG_NAME_INVITATION]} />,
    );

    await page
      .getByRole("button", {
        name: PROJECT_INVITATION_COPY.declineLabel(PROJECT),
      })
      .click();

    await vi.waitFor(() => {
      expect(actions.declineProjectInvitationAction).toHaveBeenCalledOnce();
    });
    const [sent] = actions.declineProjectInvitationAction.mock.lastCall ?? [];
    expect(sent?.get("invitationId")).toBe(LONG_NAME_INVITATION.id);
  });
});
