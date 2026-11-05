import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ProjectInvitationFeedback } from "@/components/project-invitation-feedback.tsx";
import { PROJECT_INVITATION_COPY } from "@/ui/copy/project-invitations.ts";

test("declining an invitation leaves a focused result after its card disappears", async () => {
  const url = new URL(globalThis.location.href);
  url.searchParams.set("declined", "1");
  url.searchParams.set("keep", "yes");
  globalThis.history.replaceState(globalThis.history.state, "", url);
  await render(<ProjectInvitationFeedback completed={true} />);
  const status = page.getByRole("status");
  await expect
    .element(status)
    .toHaveTextContent(PROJECT_INVITATION_COPY.declined);
  await expect.element(status).toHaveFocus();
  const after = new URL(globalThis.location.href);
  expect(after.searchParams.has("declined")).toBe(false);
  expect(after.searchParams.get("keep")).toBe("yes");
  after.searchParams.delete("keep");
  globalThis.history.replaceState(globalThis.history.state, "", after);
});
