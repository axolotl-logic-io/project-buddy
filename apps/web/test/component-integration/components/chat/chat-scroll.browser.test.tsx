import {
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatView } from "@/components/chat-view.tsx";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture } from "../../../support/id-fixtures.ts";
import { LAPTOP_VIEWPORT, PHONE_VIEWPORT } from "../../viewports-test-kit.ts";
import { answerChat } from "../chat-stream-test-kit.ts";

vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const LONG_TEXT = Array.from(
  { length: 50 },
  (_, index) => `Paragraph ${index}. An earlier part of the chat.`,
).join("\n\n");
const KEYBOARD_HEIGHT = 400;
// How far Firefox moved the visual viewport on a wheel step (Firefox 149).
const VIEWPORT_JITTER = -0.23;
const HISTORY: UIMessage[] = [
  { id: "old", role: "assistant", parts: [{ type: "text", text: LONG_TEXT }] },
];

function bottomGap(): number {
  return (
    document.documentElement.scrollHeight - window.innerHeight - window.scrollY
  );
}

async function openChat(): Promise<void> {
  await render(
    <ChatView
      chatId={chatIdFixture()}
      buddyName="Hippy"
      initialMessages={HISTORY}
    />,
  );
}

// Cross both the render and resize-observer phases before checking that an
// incoming update did not move the reader. No clock or delay paces the test.
async function layoutSettled(): Promise<void> {
  await new Promise<number>(requestAnimationFrame);
  await new Promise<number>(requestAnimationFrame);
}

async function readEarlier(): Promise<number> {
  const y = Math.floor(window.scrollY / 2);
  window.scrollTo({ top: y, behavior: "instant" });
  // Await the browser's scroll event before delivering more stream content.
  await new Promise<void>((resolve) =>
    window.addEventListener("scroll", () => resolve(), { once: true }),
  );
  return window.scrollY;
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
});

describe("use_case_follow_latest_messages", () => {
  for (const size of [LAPTOP_VIEWPORT, PHONE_VIEWPORT]) {
    test(`opening, sending, streaming and reading earlier at ${size.width}px`, async () => {
      await page.viewport(size.width, size.height);
      const stream = new TransformStream<UIMessageChunk, UIMessageChunk>();
      const writer = stream.writable.getWriter();
      answerChat(createUIMessageStreamResponse({ stream: stream.readable }));
      await openChat();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);
      expect(window.scrollY).toBeGreaterThan(0);
      const input = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
      await input.fill("Continue");
      await readEarlier();
      // Enter sends without a click scrolling the composer into view first.
      input
        .element()
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );
      await expect
        .element(page.getByText("Continue", { exact: true }))
        .toBeVisible();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);
      await writer.write({ type: "start", messageId: "reply" });
      await writer.write({ type: "text-start", id: "text" });
      await writer.write({
        type: "text-delta",
        id: "text",
        delta: `First stream.\n\n${LONG_TEXT}`,
      });
      await expect
        .element(page.getByText("First stream.", { exact: true }))
        .toBeVisible();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);
      const readingY = await readEarlier();
      await writer.write({
        type: "text-delta",
        id: "text",
        delta: `\n\nSecond stream.\n\n${LONG_TEXT}`,
      });
      await expect
        .element(page.getByText("Second stream.", { exact: true }))
        .toBeInTheDocument();
      await layoutSettled();
      expect(window.scrollY).toBe(readingY);
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "instant",
      });
      await new Promise<void>((resolve) =>
        window.addEventListener("scroll", () => resolve(), { once: true }),
      );
      await writer.write({
        type: "text-delta",
        id: "text",
        delta: `\n\nThird stream.\n\n${LONG_TEXT}`,
      });
      await expect
        .element(page.getByText("Third stream.", { exact: true }))
        .toBeInTheDocument();
      await expect.poll(bottomGap).toBeLessThanOrEqual(1);
      await writer.write({ type: "text-end", id: "text" });
      await writer.write({ type: "finish" });
      await writer.close();
    });
  }

  test("keyboard resizing follows the bottom and preserves an earlier reading position", async () => {
    await page.viewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
    await layoutSettled();
    await openChat();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    expect(window.scrollY).toBeGreaterThan(0);
    await page.getByRole("textbox", { name: CHAT_COPY.messageLabel }).click();
    await page.viewport(PHONE_VIEWPORT.width, KEYBOARD_HEIGHT);
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    await expect
      .element(page.getByRole("textbox", { name: CHAT_COPY.messageLabel }))
      .toBeInViewport({ ratio: 1 });
    await page.viewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
    await layoutSettled();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    const readingY = await readEarlier();
    await page.viewport(PHONE_VIEWPORT.width, KEYBOARD_HEIGHT);
    await layoutSettled();
    expect(window.scrollY).toBe(readingY);
  });
  test("a visual-only keyboard raises the composer without animated scrolling", async () => {
    await page.viewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
    await layoutSettled();
    const viewport = Object.assign(new EventTarget(), {
      height: PHONE_VIEWPORT.height,
      offsetTop: 0,
    });
    vi.stubGlobal("visualViewport", viewport);
    const scroll = vi.spyOn(globalThis, "scrollTo");
    await openChat();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    const input = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
    await input.click();
    viewport.height = KEYBOARD_HEIGHT;
    viewport.dispatchEvent(new Event("resize"));
    await layoutSettled();
    await expect
      .poll(() => input.element().getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(KEYBOARD_HEIGHT);
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    expect(scroll).toHaveBeenCalledWith({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    });
    viewport.height = PHONE_VIEWPORT.height;
    viewport.dispatchEvent(new Event("resize"));
    await layoutSettled();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    const readingY = await readEarlier();
    viewport.height = KEYBOARD_HEIGHT;
    viewport.dispatchEvent(new Event("resize"));
    await layoutSettled();
    expect(window.scrollY).toBe(readingY);
  });

  test("a sub-pixel visual viewport scroll leaves wheel scrolling alone", async () => {
    await page.viewport(LAPTOP_VIEWPORT.width, LAPTOP_VIEWPORT.height);
    await layoutSettled();
    const viewport = Object.assign(new EventTarget(), {
      height: LAPTOP_VIEWPORT.height,
      offsetTop: 0,
    });
    vi.stubGlobal("visualViewport", viewport);
    await openChat();
    await expect.poll(bottomGap).toBeLessThanOrEqual(1);
    await layoutSettled();
    // Firefox's wheel scrolling: the visual viewport's scroll, a fraction
    // of a pixel off, arrives before the window's own scroll event.
    const y = Math.floor(window.scrollY / 2);
    const scrolled = new Promise<void>((resolve) =>
      window.addEventListener("scroll", () => resolve(), { once: true }),
    );
    window.scrollTo({ top: y, behavior: "instant" });
    viewport.offsetTop = VIEWPORT_JITTER;
    viewport.dispatchEvent(new Event("scroll"));
    await scrolled;
    await layoutSettled();
    expect(window.scrollY).toBe(y);
  });
});
