import {
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatView } from "@/components/chat-view.tsx";
import type { Construct } from "@/constructs/construct.ts";
import { getConstruct } from "@/constructs/index.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import {
  chatIdFixture,
  questIdFixture,
  userIdFixture,
} from "../../../support/id-fixtures.ts";
import { applyTheme } from "../../themes/theme-test-kit.ts";
import { answerChat } from "../chat-stream-test-kit.ts";

vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const ADVENTURE_ID = chatIdFixture();
const VIEWER = userIdFixture();
const OPENING: UIMessage = {
  id: "opening",
  role: "assistant",
  parts: [{ type: "text", text: "Welcome to this conversation." }],
};
const QUESTION: UIMessage = {
  id: "question",
  role: "user",
  parts: [{ type: "text", text: "Where next?" }],
};
const ANSWER: UIMessage = {
  id: "answer",
  role: "assistant",
  parts: [{ type: "text", text: "Take one small step." }],
};
const HISTORY: UIMessage[] = [OPENING, QUESTION, ANSWER];
const CONSTRUCT_NAME = /Lumen|Vellum/u;
const LAPTOP_WIDTH = 1280;
const LAPTOP_HEIGHT = 900;
const AVATAR_SIZE = 24;
const PHONE_WIDTH = 320;
const PHONE_HEIGHT = 700;

function view(
  construct: Construct,
  messages: UIMessage[] = HISTORY,
): React.JSX.Element {
  return (
    <ChatView
      questId={questIdFixture()}
      viewer={VIEWER}
      chatId={ADVENTURE_ID}
      construct={construct}
      initialMessages={messages}
    />
  );
}

function opening(): HTMLElement | SVGElement {
  return page.getByRole("img", { name: CONSTRUCT_NAME }).element();
}

function portraitFor(text: string): HTMLElement {
  const message = page
    .getByRole("listitem")
    .filter({ hasText: text })
    .element();
  const portrait = message.querySelector<HTMLElement>("[data-active]");
  if (portrait === null) {
    throw new Error("Reply portrait missing");
  }
  return portrait;
}

function activity(text: string): {
  busy: string | null | undefined;
  animated: boolean;
} {
  const portrait = portraitFor(text);
  return {
    busy: portrait.closest("li")?.getAttribute("aria-busy"),
    animated: getComputedStyle(portrait).animationName !== "none",
  };
}
function motionAllowed(): boolean {
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

beforeEach(() => applyTheme("parchment"));

afterEach(async () => {
  vi.unstubAllGlobals();
  await page.viewport(LAPTOP_WIDTH, LAPTOP_HEIGHT);
});

describe("use_case_construct_presence", () => {
  for (const id of ["lumen", "vellum"] as const) {
    test(`${id} keeps one opening and circular portraits at 320px across saved updates`, async () => {
      await page.viewport(PHONE_WIDTH, PHONE_HEIGHT);
      const fetchMock = vi.fn<typeof fetch>();
      vi.stubGlobal("fetch", fetchMock);
      const construct = getConstruct(id);
      const screen = await render(view(construct));
      await expect
        .element(page.getByText("Welcome to this conversation."))
        .toBeVisible();
      expect(
        page.getByRole("img", { name: construct.name }).elements(),
      ).toHaveLength(1);
      const art = opening();
      expect(art.closest("li")?.textContent).toContain(
        "Welcome to this conversation.",
      );
      expect(art.getBoundingClientRect().width).toBeGreaterThan(AVATAR_SIZE);
      const portrait = portraitFor("Take one small step.");
      const avatarDrawing = portrait.querySelector("svg");
      const openingDrawing = art.querySelector("svg");
      expect(avatarDrawing).toBeInstanceOf(SVGSVGElement);
      expect(openingDrawing).toBeInstanceOf(SVGSVGElement);
      expect(avatarDrawing?.getAttribute("viewBox")).not.toBe(
        openingDrawing?.getAttribute("viewBox"),
      );
      const gradientIds = [avatarDrawing, openingDrawing].flatMap((drawing) =>
        Array.from(
          drawing?.querySelectorAll("radialGradient[id], linearGradient[id]") ??
            [],
          (gradient) => gradient.id,
        ),
      );
      expect(gradientIds.length).toBeGreaterThan(1);
      for (const gradientId of gradientIds) {
        expect(document.querySelectorAll(`[id="${gradientId}"]`)).toHaveLength(
          1,
        );
      }
      expect(portrait.getBoundingClientRect().width).toBe(AVATAR_SIZE);
      const avatar = portrait.querySelector("[data-visual-role]");
      if (avatar === null) {
        throw new Error("Avatar missing");
      }
      expect(getComputedStyle(avatar).borderRadius).toBe("50%");
      expect(activity("Take one small step.")).toEqual({
        busy: "false",
        animated: false,
      });
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        PHONE_WIDTH,
      );
      expect(
        page
          .getByRole("listitem")
          .filter({ hasText: "Where next?" })
          .element()
          .querySelector("[role=img]"),
      ).toBeNull();
      await screen.rerender(
        view(construct, [...HISTORY, { ...QUESTION, id: "next" }]),
      );
      expect(
        page.getByRole("img", { name: construct.name }).elements(),
      ).toHaveLength(1);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    for (const ending of ["finish", "stop", "error"] as const) {
      test(`${id} animates only while replying and settles on ${ending}`, async () => {
        const construct = getConstruct(id);
        const stream = new TransformStream<UIMessageChunk, UIMessageChunk>();
        const writer = stream.writable.getWriter();
        answerChat(createUIMessageStreamResponse({ stream: stream.readable }));
        await render(view(construct, [OPENING]));
        const input = page.getByRole("textbox", {
          name: CHAT_COPY.messageLabel,
        });
        await input.fill("Please continue");
        await page
          .getByRole("button", { name: CHAT_COPY.send, exact: true })
          .click();
        await expect
          .element(page.getByText(CHAT_COPY.thinking(construct.name)))
          .toBeVisible();
        expect(activity(CHAT_COPY.thinking(construct.name))).toEqual({
          busy: "true",
          animated: motionAllowed(),
        });
        await writer.write({ type: "start", messageId: "streamed" });
        await writer.write({ type: "text-start", id: "text" });
        await writer.write({
          type: "text-delta",
          id: "text",
          delta: "A streamed step.",
        });
        await expect.element(page.getByText("A streamed step.")).toBeVisible();
        expect(activity("A streamed step.")).toEqual({
          busy: "true",
          animated: motionAllowed(),
        });
        await expect
          .element(page.getByText(CHAT_COPY.writing(construct.name)))
          .toBeInTheDocument();
        if (ending === "stop") {
          await writer.write({ type: "abort" });
          await writer.close();
        } else if (ending === "error") {
          await writer.write({ type: "error", errorText: "Reply failed" });
          await writer.close();
        } else {
          await writer.write({ type: "text-end", id: "text" });
          await writer.write({ type: "finish" });
          await writer.close();
        }
        await expect
          .element(
            page.getByRole("listitem").filter({ hasText: "A streamed step." }),
          )
          .toHaveAttribute("aria-busy", "false");
        expect(activity("A streamed step.")).toEqual({
          busy: "false",
          animated: false,
        });
      });
    }
  }

  test("a history starting with a user message never treats a later reply as an opening", async () => {
    await render(view(getConstruct("lumen"), [QUESTION, ANSWER]));
    expect(page.getByRole("img").elements()).toHaveLength(0);
    expect(
      portraitFor("Take one small step.").querySelector("svg"),
    ).not.toBeNull();
  });
});
