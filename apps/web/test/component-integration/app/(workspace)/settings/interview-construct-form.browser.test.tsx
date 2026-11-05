import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { setInterviewConstructAction } from "@/app/(workspace)/settings/actions.ts";
import { InterviewConstructForm } from "@/app/(workspace)/settings/interview-construct-form.tsx";
import { NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { INTERVIEW_CONSTRUCT_COPY } from "@/ui/copy/settings.ts";
import { userConstructIdFixture } from "../../../../support/id-fixtures.ts";

const actions = vi.hoisted(() => ({
  setInterviewConstructAction: vi.fn<typeof setInterviewConstructAction>(),
}));
vi.mock("@/app/(workspace)/settings/actions.ts", () => actions);
afterEach(() => vi.clearAllMocks());

describe("use_case_set_interview_construct", () => {
  test("shows the saved construct and lets the user save their own construct", async () => {
    const own = { id: userConstructIdFixture(), name: "Pip" };
    actions.setInterviewConstructAction.mockResolvedValue({ kind: "saved" });
    await render(
      <InterviewConstructForm constructId="lumen" userConstructs={[own]} />,
    );
    await expect
      .element(page.getByText("Lumen", { exact: true }))
      .toBeVisible();
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.previousConstruct })
      .click();
    await page
      .getByRole("button", { name: NEW_CHAT_COPY.previousConstruct })
      .click();
    await expect
      .element(page.getByText(own.name, { exact: true }))
      .toBeVisible();
    await page
      .getByRole("button", { name: INTERVIEW_CONSTRUCT_COPY.save })
      .click();
    await expect
      .element(page.getByText(INTERVIEW_CONSTRUCT_COPY.saved))
      .toBeVisible();
    const [, sent] = actions.setInterviewConstructAction.mock.lastCall ?? [];
    expect(sent?.get("constructId")).toBe(own.id);
  });
});
