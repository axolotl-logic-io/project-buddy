// Regression coverage for milestone tool contract.
// and WebKit: a reopened chat whose saved reply recorded a milestone shows
// it apart from the construct's words, with a link to the progress timeline,
// and a call that failed shows the failure line. What the reply streams and
// saves is milestones.server.test.ts's.

import type { UIMessage } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatView } from "@/components/chat-view.tsx";
import { getConstruct } from "@/constructs/index.ts";
import {
  RECORD_MILESTONE_TOOL,
  type RecordMilestoneInput,
} from "@/replies/tools/record-milestone-contract.ts";
import { TOOL_FAILURES_COPY } from "@/ui/copy/chat.ts";
import { MILESTONE_COPY } from "@/ui/copy/milestones.ts";
import {
  chatIdFixture,
  milestoneIdFixture,
  questIdFixture,
  userIdFixture,
} from "../../../support/id-fixtures.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const QUEST_ID = questIdFixture();
const MILESTONE_TEXT = "Blocked out the shell and body";
const MILESTONE_INPUT: RecordMilestoneInput = { text: MILESTONE_TEXT };

// The chat as it was saved: her message, then the construct's reply with a
// record_milestone call in the state given.
async function renderSavedChat(
  call: UIMessage["parts"][number],
): Promise<void> {
  await render(
    <ChatView
      viewer={userIdFixture()}
      constructName={getConstruct("vellum").name}
      chatId={chatIdFixture()}
      initialMessages={[
        {
          id: "m1",
          role: "user",
          parts: [{ type: "text", text: "The shell is blocked out!" }],
        },
        {
          id: "r1",
          role: "assistant",
          parts: [{ type: "text", text: "Lovely work." }, call],
        },
      ]}
    />,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("milestone tool contract", () => {
  test("a reopened chat shows the milestone it recorded, linked to the progress timeline", async () => {
    await renderSavedChat({
      type: `tool-${RECORD_MILESTONE_TOOL}`,
      toolCallId: "call-milestone",
      state: "output-available",
      input: MILESTONE_INPUT,
      output: {
        status: "recorded",
        milestoneId: milestoneIdFixture(),
        questId: QUEST_ID,
        text: MILESTONE_TEXT,
        recordedAt: "2026-10-30T12:00:00.000Z",
      },
    });

    const milestone = page.getByRole("complementary", {
      name: MILESTONE_COPY.recordedLabel,
    });
    await expect.element(milestone).toMatchTextContent(MILESTONE_TEXT);
    await expect.element(milestone).toMatchTextContent(MILESTONE_COPY.recorded);
    await expect
      .element(
        milestone.getByRole("link", { name: MILESTONE_COPY.timelineLink }),
      )
      .toHaveAttribute("href", `/quests/${QUEST_ID}`);
  });

  test("a call that failed shows that the milestone wasn't added", async () => {
    await renderSavedChat({
      type: `tool-${RECORD_MILESTONE_TOOL}`,
      toolCallId: "call-milestone",
      state: "output-error",
      input: MILESTONE_INPUT,
      errorText: "No project",
    });

    await expect
      .element(page.getByText(TOOL_FAILURES_COPY.recordMilestone))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("complementary", { name: MILESTONE_COPY.recordedLabel }),
      )
      .not.toBeInTheDocument();
  });
});
