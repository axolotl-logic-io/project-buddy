// "use_case_chat_with_several_people" in use-cases/chats.md, in Chromium and
// WebKit: a quest's conversation names the author of each user message someone else
// wrote, before its text, and shows "You" on the viewer's own, as a chat
// only the viewer writes in always has. A long name wraps on the narrowest
// phone. That the store reads each message's author is checked in
// message-authors.server.test.ts.
import type { JSX } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  type ChatMessage,
  type MessageAuthor,
  withAuthor,
} from "@/chats/message-author.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";
import { DEFAULT_FLAG_ATTRIBUTES } from "@/flags/flag-choice.ts";
import { DEFAULT_THEME_ATTRIBUTES } from "@/themes/theme-choice.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { userIdFixture } from "../../../../../support/id-fixtures.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../../auth/current-user-test-kit.ts";
import {
  NARROWEST_VIEWPORT,
  setViewport,
} from "../../../../viewports-test-kit.ts";
import { inWorkspace } from "../../../workspace-test-kit.tsx";
import { FOX_CHAT } from "../../page-fixtures.ts";

vi.mock(
  "@/plan/plan-actions.ts",
  () => import("../../../../plan/plan-actions-test-kit.ts"),
);
vi.mock(
  "@/plan/plan-store.ts",
  () => import("../../../../plan/plan-store-test-kit.ts"),
);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../../auth/current-user-test-kit.ts"),
);

vi.mock(
  "next/navigation",
  () => import("../../../../components/router-test-kit.ts"),
);

const VIEWER: MessageAuthor = {
  id: SIGNED_IN_USER.id,
  name: "Fox",
};
const ALEX: MessageAuthor = {
  id: userIdFixture("2b3c4d5e-6f7a-4b2c-9d3e-4f5a6b7c8d9e"),
  name: "Alex",
};
// An author with no name, shown by their email address, too long for a
// phone's line, with nowhere to break it.
const LONG_EMAIL: MessageAuthor = {
  id: userIdFixture("3c4d5e6f-7a8b-4c3d-8e4f-5a6b7c8d9e0f"),
  name: undefined,
  email: "a.very.long.email.address.without.any.spaces@example.com",
};

function said(id: string, author: MessageAuthor, text: string): ChatMessage {
  return withAuthor(
    { id, role: "user", parts: [{ type: "text", text }] },
    author,
  );
}

function reply(id: string, text: string): ChatMessage {
  return { id, role: "assistant", parts: [{ type: "text", text }] };
}

function conversation(messages: ChatMessage[]): JSX.Element {
  return inWorkspace(
    <ChatScreen
      conversation={FOX_CHAT}
      messages={messages}
      stoppedReplyId={undefined}
      viewer={SIGNED_IN_USER.id}
    />,
  );
}

// The text of each message in the conversation, in order, as a screen
// reader reads it.
function messageTexts(): string[] {
  return page
    .getByRole("list", { name: CHAT_COPY.conversationLabel })
    .getByRole("listitem")
    .elements()
    .filter((item) => item.parentElement?.closest("li") === null)
    .map((item) => {
      const readable = item.cloneNode(true);
      if (!(readable instanceof Element)) {
        throw new Error("Message is not an element");
      }
      for (const decoration of readable.querySelectorAll(
        '[aria-hidden="true"]',
      )) {
        decoration.remove();
      }
      return readable.textContent ?? "";
    });
}

beforeEach(() => {
  for (const [name, value] of Object.entries({
    ...DEFAULT_THEME_ATTRIBUTES,
    ...DEFAULT_FLAG_ATTRIBUTES,
  })) {
    document.documentElement.setAttribute(name, value);
  }
  signInAs(SIGNED_IN_USER);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_chat_with_several_people", () => {
  test("someone else's messages show their name, and hers show You", async () => {
    await render(
      conversation([
        said("m1", ALEX, "The flipper loops are fixed."),
        said("m2", VIEWER, "Nice. Can we look at the shell next?"),
        reply("r2", "Great work, Alex."),
      ]),
    );

    await expect
      .element(page.getByText("Great work, Alex."))
      .toBeInTheDocument();
    expect(messageTexts()).toStrictEqual([
      "AlexThe flipper loops are fixed.",
      `${CHAT_COPY.you}Nice. Can we look at the shell next?`,
      `${FOX_CHAT.construct.name}Great work, Alex.${CHAT_COPY.costUnknown}`,
    ]);
  });

  test("a chat only she writes in shows no names but You", async () => {
    await render(
      conversation([
        said("m1", VIEWER, "The flipper loops are fixed."),
        reply("r1", "Great work."),
      ]),
    );

    await expect.element(page.getByText("Great work.")).toBeInTheDocument();
    expect(messageTexts()).toStrictEqual([
      `${CHAT_COPY.you}The flipper loops are fixed.`,
      `${FOX_CHAT.construct.name}Great work.${CHAT_COPY.costUnknown}`,
    ]);
  });

  test("a long name wraps at 320 px", async () => {
    await setViewport(NARROWEST_VIEWPORT);
    await render(
      conversation([said("m1", LONG_EMAIL, "The flipper loops are fixed.")]),
    );

    const name = page.getByText(LONG_EMAIL.email);
    await expect.element(name).toBeVisible();
    // Her messages sit at the end of the line, so a name that didn't wrap
    // would run off its start.
    const { left, right } = name.element().getBoundingClientRect();
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThanOrEqual(NARROWEST_VIEWPORT.width);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      NARROWEST_VIEWPORT.width,
    );
  });
});
