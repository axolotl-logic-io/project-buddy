import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { describe, expect, test, vi } from "vitest";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import {
  CREATE_PROJECT_TOOL,
  type CreateProjectOutput,
} from "@/tutor/tools/create-project-contract.ts";
import {
  CREATE_PROJECT_COPY,
  quotaUsedUpMessage,
  TOOL_FAILURES_COPY,
} from "@/ui/copy/chat.ts";
import { chatIdFixture, projectIdFixture } from "../../id-fixtures.ts";

const BUDDY_NAME: string = getBuddy("hippy").name;

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const INPUT = { name: "Low-poly fox" };
const INTERVIEW_CHAT_ID = chatIdFixture();
const RESETS_ON = "2026-11-01T00:00:00.000Z";

// A saved reply in the central chat in which the tutor called
// create_project, with this part.
function renderSavedCall(part: UIMessage["parts"][number]): void {
  render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={[{ id: "r1", role: "assistant", parts: [part] }]}
      buddyName={BUDDY_NAME}
    />,
  );
}

// A saved reply in which the tutor called create_project and got output.
function renderSavedResult(output: CreateProjectOutput): void {
  renderSavedCall({
    type: `tool-${CREATE_PROJECT_TOOL}`,
    toolCallId: "call-1",
    state: "output-available",
    input: INPUT,
    output,
  });
}

describe("CreateProjectPart for a call that answered", () => {
  test("says the project was created and links to its interview chat", () => {
    renderSavedResult({
      status: "created",
      projectId: projectIdFixture(),
      name: INPUT.name,
      interviewChatId: INTERVIEW_CHAT_ID,
    });

    expect(
      screen.getByText(CREATE_PROJECT_COPY.created(INPUT.name)),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: CREATE_PROJECT_COPY.openInterview }),
    ).toHaveAttribute("href", `/chats/${INTERVIEW_CHAT_ID}`);
  });

  test("says Claude is unavailable, with no link", () => {
    renderSavedResult({ status: "claudeUnavailable" });

    expect(
      screen.getByText(CREATE_PROJECT_COPY.claudeUnavailable),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: CREATE_PROJECT_COPY.openInterview }),
    ).toBeNull();
  });

  test("says the quota is used up, with the day it resets", () => {
    renderSavedResult({ status: "quotaUsedUp", resetsOn: RESETS_ON });

    expect(
      screen.getByText(quotaUsedUpMessage(new Date(RESETS_ON))),
    ).toBeInTheDocument();
  });
});

describe("CreateProjectPart for a call that failed or can't be read", () => {
  test("says the project wasn't created when the tool call failed", () => {
    renderSavedCall({
      type: `tool-${CREATE_PROJECT_TOOL}`,
      toolCallId: "call-1",
      state: "output-error",
      input: INPUT,
      errorText: "The database is down",
    });

    expect(
      screen.getByText(TOOL_FAILURES_COPY.createProject),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("The database is down");
  });

  test("shows nothing for output it can't read", () => {
    renderSavedCall({
      type: `tool-${CREATE_PROJECT_TOOL}`,
      toolCallId: "call-1",
      state: "output-available",
      input: INPUT,
      output: { status: "somethingElse" },
    });

    expect(
      screen.queryByRole("link", { name: CREATE_PROJECT_COPY.openInterview }),
    ).toBeNull();
    expect(document.body).not.toHaveTextContent("somethingElse");
  });
});
