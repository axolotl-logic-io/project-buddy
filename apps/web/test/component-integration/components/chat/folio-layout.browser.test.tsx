import type { UIMessage } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatView } from "@/components/chat-view.tsx";
import { getConstruct } from "@/constructs/index.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  chatIdFixture,
  questIdFixture,
  userIdFixture,
} from "../../../support/id-fixtures.ts";
import { applyTheme } from "../../themes/theme-test-kit.ts";

vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const NAME_REPEATS = 8;
const DESKTOP_WIDTH = 1280;
const PHONE_WIDTH = 320;
const VIEWPORT_HEIGHT = 800;
const PROSE_SIZE = 17;
const INPUT_SIZE = 16;
const TARGET_SIZE = 44;
const TWO_LINES_HEIGHT = 48;
const FULL_READING_WIDTH = 0.95;
const LONG_NAME = "AlexandriaMorgan".repeat(NAME_REPEATS);
const QUESTION = "Keep the map readable on a small phone.";
const REPLY = "A bell sounds beyond the river.";
const MESSAGES: UIMessage[] = [
  { id: "you", role: "user", parts: [{ type: "text", text: "cast tasks" }] },
  { id: "member", role: "user", parts: [{ type: "text", text: QUESTION }] },
  {
    id: "reply",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: `## Opening screen\n\n${REPLY}\n\n- Follow the lanterns.\n- Ask the ferryman.`,
      },
    ],
  },
];

afterEach(async () => {
  await page.viewport(DESKTOP_WIDTH, VIEWPORT_HEIGHT);
});

describe("Folio reading layout", () => {
  for (const mode of ["light", "soot-brass", "dark"] as const) {
    for (const width of [PHONE_WIDTH, DESKTOP_WIDTH]) {
      test(`readable shared conversation and composer at ${width}px in ${mode}`, async () => {
        await page.viewport(width, VIEWPORT_HEIGHT);
        applyTheme("parchment", mode);
        await render(
          <ChatView
            questId={questIdFixture()}
            chatId={chatIdFixture()}
            viewer={userIdFixture()}
            constructName="Lumen"
            construct={getConstruct("lumen")}
            initialMessages={MESSAGES}
            authorNames={new Map([["member", LONG_NAME]])}
          />,
        );
        const conversation = page.getByRole("list", {
          name: CHAT_COPY.conversationLabel,
        });
        await expect.element(conversation.getByText(LONG_NAME)).toBeVisible();
        const member = conversation
          .getByRole("listitem")
          .filter({ hasText: QUESTION });
        const prose = member.getByText(QUESTION).element();
        const author = member.getByText(LONG_NAME).element();
        expect(author.compareDocumentPosition(prose)).toBe(
          Node.DOCUMENT_POSITION_FOLLOWING,
        );
        expect(
          Number.parseFloat(getComputedStyle(prose).fontSize),
        ).toBeGreaterThanOrEqual(PROSE_SIZE);
        expect(
          prose.getBoundingClientRect().width /
            conversation.element().getBoundingClientRect().width,
        ).toBeGreaterThan(FULL_READING_WIDTH);
        expect(author.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          prose.getBoundingClientRect().bottom,
        );
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
          window.innerWidth,
        );
        const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
        await box.fill("First line\nSecond line");
        await expect.element(box).toHaveValue("First line\nSecond line");
        expect(
          Number.parseFloat(getComputedStyle(box.element()).fontSize),
        ).toBeGreaterThanOrEqual(INPUT_SIZE);
        const send = page
          .getByRole("button", { name: CHAT_COPY.send })
          .element()
          .getBoundingClientRect();
        expect(send.width).toBeGreaterThanOrEqual(TARGET_SIZE);
        expect(send.height).toBeGreaterThanOrEqual(TARGET_SIZE);
        const input = box.element().getBoundingClientRect();
        expect(input.right).toBeLessThanOrEqual(send.left);
        expect(input.height).toBeGreaterThanOrEqual(TWO_LINES_HEIGHT);
      });
    }
  }
});
