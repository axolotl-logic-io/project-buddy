// "use_case_send_message" in use-cases/chats.md, in Chromium and WebKit:
// her typing survives the reply finishing while she types, and a message she
// hasn't sent is still in the box when she comes back to the chat. The
// test's fetch
// holds the chat stream's `finish` chunk, and everything after it, until the
// test lets it through, so the reply's text shows while its run is still
// going: the moment the round 2 merge saw WebKit drop text typed into the
// composer.
import type { UIMessageChunk } from "ai";
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getBuddy } from "@/buddies/index.ts";
import { ChatView } from "@/components/chat-view.tsx";
import type { ChatId, UserId } from "@/ids.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture, userIdFixture } from "../../../support/id-fixtures.ts";
import { answerChat, holdBeforeChunk } from "../chat-stream-test-kit.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const QUESTION = "How do I bevel an edge?";
const REPLY = "Select the edge and press Ctrl+B.";
const NEXT_MESSAGE = "And then how do I smooth it?";

// The chunks of the reply, up to its `finish`, as the chat route streams
// them (AI SDK's UI message stream).
const CHUNKS_BEFORE_FINISH: readonly UIMessageChunk[] = [
  { type: "start", messageId: "r1" },
  { type: "start-step" },
  { type: "text-start", id: "t1" },
  { type: "text-delta", id: "t1", delta: REPLY },
  { type: "text-end", id: "t1" },
  { type: "finish-step" },
];
const FINISH_CHUNK: UIMessageChunk = { type: "finish" };
function holdChatFinish(): { release: () => void } {
  const held = holdBeforeChunk(
    [...CHUNKS_BEFORE_FINISH, FINISH_CHUNK],
    CHUNKS_BEFORE_FINISH.length,
  );
  answerChat(held.response);
  return held;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// Opens the chat, empty, as viewer, as its page does on each visit.
async function openChat(
  chatId: ChatId,
  viewer: UserId,
): Promise<{ unmount: () => Promise<void> }> {
  const screen = await render(
    <ChatView
      chatId={chatId}
      viewer={viewer}
      initialMessages={[]}
      buddyName={getBuddy("mr-tee").name}
    />,
  );
  return { unmount: (): Promise<void> => screen.unmount() };
}

describe("use_case_send_message", () => {
  test("her typing survives the reply finishing while she types", async () => {
    const heldFinish = holdChatFinish();
    await render(
      <ChatView
        chatId={chatIdFixture()}
        viewer={userIdFixture()}
        initialMessages={[]}
        buddyName={getBuddy("mr-tee").name}
      />,
    );
    const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
    const send = page.getByRole("button", { name: CHAT_COPY.send });
    const lastMessage = page.getByRole("listitem").last();

    // The reply's text shows while its finish is held.
    await box.fill(QUESTION);
    await send.click();
    await expect.element(lastMessage.getByText(REPLY)).toBeVisible();
    await expect.element(lastMessage).toHaveAttribute("aria-busy", "true");

    // She types her next message before the reply finishes.
    await box.fill(NEXT_MESSAGE);
    await expect.element(box).toHaveValue(NEXT_MESSAGE);
    await expect.element(send).toBeDisabled();

    // The reply finishes, and her message is still there to send.
    heldFinish.release();
    await expect.element(lastMessage).toHaveAttribute("aria-busy", "false");
    await expect.element(box).toHaveValue(NEXT_MESSAGE);
    await expect.element(send).toBeEnabled();
  });

  test("a message she hasn't sent is still in the box when she comes back, and sending it empties the box for good", async () => {
    const heldFinish = holdChatFinish();
    heldFinish.release();
    const chatId = chatIdFixture();
    const viewer = userIdFixture();
    const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });

    // She types, then leaves the chat for another page.
    const firstVisit = await openChat(chatId, viewer);
    await box.fill(QUESTION);
    await firstVisit.unmount();

    // Back in the chat, her message is waiting; another chat's box and
    // another person's view of this chat are empty.
    const otherChat = await openChat(chatIdFixture(), viewer);
    await expect.element(box).toHaveValue("");
    await otherChat.unmount();
    const otherViewer = await openChat(chatId, userIdFixture());
    await expect.element(box).toHaveValue("");
    await otherViewer.unmount();
    const secondVisit = await openChat(chatId, viewer);
    await expect.element(box).toHaveValue(QUESTION);

    // Once sent, it isn't put back on her next visit.
    await page.getByRole("button", { name: CHAT_COPY.send }).click();
    await expect
      .element(page.getByRole("listitem").last().getByText(REPLY))
      .toBeVisible();
    await secondVisit.unmount();
    await openChat(chatId, viewer);
    await expect.element(box).toHaveValue("");
  });
});

test("restores an image reattach reminder without storing private media", async () => {
  const chatId = chatIdFixture();
  const viewer = userIdFixture();
  const key = `draft:chat:${viewer}:${chatId}`;
  localStorage.setItem(
    key,
    JSON.stringify({ text: "Unsent text", images: true }),
  );
  await openChat(chatId, viewer);
  await expect.element(page.getByText(CHAT_COPY.reattach)).toBeVisible();
  await expect
    .element(page.getByRole("textbox", { name: CHAT_COPY.messageLabel }))
    .toHaveValue("Unsent text");
  expect(JSON.parse(localStorage.getItem(key) ?? "{}")).toEqual({
    text: "Unsent text",
    images: true,
  });
});
test("blocked browser storage leaves the composer usable", async () => {
  const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  await openChat(chatIdFixture(), userIdFixture());
  const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
  await box.fill("Still editable");
  await expect.element(box).toHaveValue("Still editable");
  get.mockRestore();
  set.mockRestore();
});
