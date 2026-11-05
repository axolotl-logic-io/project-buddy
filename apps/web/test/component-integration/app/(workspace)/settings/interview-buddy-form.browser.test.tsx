import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { setInterviewBuddyAction } from "@/app/(workspace)/settings/actions.ts";
import { InterviewBuddyForm } from "@/app/(workspace)/settings/interview-buddy-form.tsx";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { INTERVIEW_BUDDY_COPY } from "@/ui/copy/settings.ts";
import { userBuddyIdFixture } from "../../../../support/id-fixtures.ts";

const actions = vi.hoisted(() => ({
  setInterviewBuddyAction: vi.fn<typeof setInterviewBuddyAction>(),
}));
vi.mock("@/app/(workspace)/settings/actions.ts", () => actions);
afterEach(() => vi.clearAllMocks());

describe("use_case_set_interview_buddy", () => {
  test("shows the saved buddy and lets the user save their own buddy", async () => {
    const own = { id: userBuddyIdFixture(), name: "Pip" };
    actions.setInterviewBuddyAction.mockResolvedValue({ kind: "saved" });
    await render(<InterviewBuddyForm buddyId="lumen" userBuddies={[own]} />);
    await expect
      .element(page.getByText("Lumen", { exact: true }))
      .toBeVisible();
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.chooseBuddyButton })
      .click();
    await page.getByRole("button", { name: own.name, exact: true }).click();
    await page.getByRole("button", { name: INTERVIEW_BUDDY_COPY.save }).click();
    await expect
      .element(page.getByText(INTERVIEW_BUDDY_COPY.saved))
      .toBeVisible();
    const [, sent] = actions.setInterviewBuddyAction.mock.lastCall ?? [];
    expect(sent?.get("buddyId")).toBe(own.id);
  });
});
