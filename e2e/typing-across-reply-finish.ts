// The test that her typing survives a reply finishing, shared by the
// Chromium spec (composer-keeps-typing.spec.ts) and the WebKit one
// (composer-keeps-typing-webkit.spec.ts). The page's fetch holds the chat
// stream's `finish` chunk, and everything after it, until the test lets it
// through, so the reply's text shows while its run is still going: the
// moment the round 2 merge saw WebKit drop text typed into the composer.
import { expect, type Page } from "@playwright/test";
import { CHAT_API_PATH } from "@/tutor/chat-protocol.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  exchange,
  expectMessages,
  lastMessage,
  openChat,
  personaName,
  sendMessage,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";

const QUESTION = "How do I bevel an edge?";
const NEXT_MESSAGE = "And then how do I smooth it?";

// Window properties the held fetch sets: a function that lets the held
// `finish` through, and whether a `finish` is being held.
const RELEASE_FINISH = "releaseHeldFinish";
const FINISH_HELD = "finishHeld";

interface HeldFinishNames {
  readonly chatPath: string;
  readonly release: string;
  readonly held: string;
}

const HELD_FINISH_NAMES: HeldFinishNames = {
  chatPath: CHAT_API_PATH,
  release: RELEASE_FINISH,
  held: FINISH_HELD,
};

// Runs in the page before its own scripts: makes its fetch hold the first
// `finish` chunk of each chatPath stream, and all that follows it, until
// globalThis[release] is called, with globalThis[held] true meanwhile.
function holdChatFinish({ chatPath, release, held }: HeldFinishNames): void {
  const finish = Promise.withResolvers<void>();
  Reflect.set(globalThis, held, false);
  Reflect.set(globalThis, release, (): void => {
    finish.resolve();
  });
  const finishMarker = 'data: {"type":"finish"';
  const pageFetch = globalThis.fetch.bind(globalThis);

  // The body, with its finish held.
  function heldBody(
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): ReadableStream<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let passed = false;
    return new ReadableStream<Uint8Array>({
      async pull(
        controller: ReadableStreamDefaultController<Uint8Array>,
      ): Promise<void> {
        const next = await reader.read();
        if (next.done) {
          controller.close();
          return;
        }
        const text = decoder.decode(next.value, { stream: true });
        const at = text.indexOf(finishMarker);
        if (passed || at === -1) {
          controller.enqueue(encoder.encode(text));
          return;
        }
        controller.enqueue(encoder.encode(text.slice(0, at)));
        Reflect.set(globalThis, held, true);
        await finish.promise;
        passed = true;
        Reflect.set(globalThis, held, false);
        controller.enqueue(encoder.encode(text.slice(at)));
      },
      cancel(reason: unknown): Promise<void> {
        return reader.cancel(reason);
      },
    });
  }

  globalThis.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const response = await pageFetch(input, init);
    const { body, headers, status, statusText } = response;
    if (!new Request(input).url.endsWith(chatPath) || body === null) {
      return response;
    }
    return new Response(heldBody(body.getReader()), {
      status,
      statusText,
      headers,
    });
  };
}

function isFinishHeld(page: Page): Promise<unknown> {
  return page.evaluate((held) => Reflect.get(globalThis, held), FINISH_HELD);
}

async function releaseFinish(page: Page): Promise<void> {
  await page.evaluate((release) => {
    const releaseHeld: unknown = Reflect.get(globalThis, release);
    if (typeof releaseHeld === "function") {
      releaseHeld();
    }
  }, RELEASE_FINISH);
}

// How long one try at typing into the composer waits for Send to enable.
const COMPOSER_TRY_MS = 1000;

// Waits until the composer takes what is typed. Text typed before the page
// has hydrated fills the box but not the composer's state, so Send stays
// disabled; WebKit hydrates well after the load event that goto waits for.
// Each try clears the box first, because React ignores typing that leaves
// the box's text as it was when the page hydrated.
// merge: share with e2e/visual/chat.spec.ts's waitForComposer
async function waitForComposer(page: Page): Promise<void> {
  const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
  const send = page.getByRole("button", { name: CHAT_COPY.send });
  await expect(async (): Promise<void> => {
    await box.clear();
    await box.fill(QUESTION);
    await expect(send).toBeEnabled({ timeout: COMPOSER_TRY_MS });
  }).toPass();
  await box.clear();
}

// Declares the test, a step of use_case_send_message, in the spec file that
// imports it, which runs it in browser.
function testTypingAcrossReplyFinish(browser: "chromium" | "webkit"): void {
  test.describe("use_case_send_message", () => {
    test(`her typing survives the reply finishing while she types, in ${browser}`, async ({
      account,
      browserName,
      page,
      testData,
    }) => {
      expect(browserName).toBe(browser);
      const chat = await testData.chat(await testData.project());
      const box = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
      const send = page.getByRole("button", { name: CHAT_COPY.send });
      await page.addInitScript(holdChatFinish, HELD_FINISH_NAMES);
      await openChat(page, account, chat);
      await waitForComposer(page);

      await test.step("the reply's text shows while its finish is held", async () => {
        await sendMessage(page, QUESTION);

        await expect.poll(() => isFinishHeld(page)).toBe(true);
        await expectMessages(
          page,
          exchange(personaName(chat.personaId), QUESTION),
        );
        await expect(lastMessage(page)).toHaveAttribute("aria-busy", "true");
      });

      await test.step("she types her next message before the reply finishes", async () => {
        await box.fill(NEXT_MESSAGE);

        await expect(box).toHaveValue(NEXT_MESSAGE);
        await expect(send).toBeDisabled();
      });

      await test.step("the reply finishes, and her message is still there to send", async () => {
        await releaseFinish(page);

        await expect(lastMessage(page)).toHaveAttribute("aria-busy", "false");
        await expect(box).toHaveValue(NEXT_MESSAGE);
        await expect(send).toBeEnabled();
      });
    });
  });
}

export { testTypingAcrossReplyFinish, waitForComposer };
