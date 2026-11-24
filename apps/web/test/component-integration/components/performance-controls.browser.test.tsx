// "use_case_construct_presence" in use-cases/performances.md, in Chromium and
// WebKit: the construct's artwork in a performance, at rest and while a
// reply is coming; and the composer that makes a message, keeps its
// draft and offers a retry. What the server saves is the server tests'.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { commands, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { Construct } from "@/constructs/index.ts";
import { getConstruct } from "@/constructs/index.ts";
import { sendMessageAction } from "@/performances/performance-actions.ts";
import type { PerformanceMessage } from "@/performances/performance-store.ts";
import { SIGN_IN_PATH } from "@/routes.ts";
import { PERFORMANCE_COPY } from "@/ui/copy/performances.ts";
import { questIdFixture, userIdFixture } from "../../support/id-fixtures.ts";
import {
  PERFORMANCE,
  performanceView,
  sentMessage,
} from "../performances/performance-test-kit.tsx";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  LAPTOP_VIEWPORT,
  NARROWEST_VIEWPORT,
  setViewport,
} from "../viewports-test-kit.ts";

vi.mock("next/navigation", () => import("./router-test-kit.ts"));

const QUEST_ID = questIdFixture();
const VIEWER = userIdFixture();
const AUTHOR = "Robin";
const ASKED = "Where next?";
const ANSWER = "Take one small step.";
const AGAIN = "And after that?";
// A reply's portrait, in CSS px.
const PORTRAIT_PX = 40;
// Each construct's motion while a reply is coming.
const CONSTRUCTS = [
  { id: "lumen", motion: "construct-glow" },
  { id: "vellum", motion: "construct-working" },
] as const;
const HISTORY: readonly PerformanceMessage[] = [
  sentMessage(ASKED, ANSWER, AUTHOR),
];

const composer = page.getByRole("textbox", {
  name: PERFORMANCE_COPY.message,
});
const send = page.getByRole("button", {
  name: PERFORMANCE_COPY.send,
  exact: true,
});
const working = page.getByRole("status").filter({
  hasText: PERFORMANCE_COPY.working,
});

function view(
  construct: Construct,
  entries: readonly PerformanceMessage[] = HISTORY,
): React.JSX.Element {
  return performanceView({
    questId: QUEST_ID,
    viewer: VIEWER,
    construct,
    entries,
    author: AUTHOR,
  });
}

// The construct's artwork in the opening, which is decorative: the opening
// line beside it says what it is.
function openingArt(): Element {
  const art = document.querySelector('[data-visual-role="opening"]');
  if (art === null) {
    throw new Error("The opening illustration is missing");
  }
  return art;
}

// The names of the CSS animations running on the page.
function motions(): string[] {
  return document
    .getAnimations()
    .filter((animation) => animation instanceof CSSAnimation)
    .map((animation) => animation.animationName);
}

// Sends a message whose reply stays coming until the test settles it.
async function sendAndWait(
  text: string,
): Promise<PromiseWithResolvers<string | undefined>> {
  const reply = Promise.withResolvers<string | undefined>();
  vi.mocked(sendMessageAction).mockReturnValueOnce(reply.promise);
  await composer.fill(text);
  await send.click();
  // The test's checks follow once the busy text shows.
  await vi.waitFor(() => working.element());
  return reply;
}

beforeEach(async () => {
  applyTheme("parchment", "dark");
  await commands.reduceMotion(false);
});

afterEach(async () => {
  vi.mocked(sendMessageAction).mockReset();
  await commands.reduceMotion(false);
  await setViewport(LAPTOP_VIEWPORT);
});

describe("use_case_construct_presence", () => {
  for (const { id } of CONSTRUCTS) {
    for (const viewport of [LAPTOP_VIEWPORT, NARROWEST_VIEWPORT]) {
      test(`${id}: one opening illustration and a circular portrait beside its name on each reply, at ${viewport.width} px`, async () => {
        await setViewport(viewport);
        const construct = getConstruct(id);
        const screen = await render(view(construct));
        const reply = page.getByRole("listitem").filter({ hasText: ANSWER });
        await expect.element(reply).toBeVisible();

        // The opening: one illustration, larger than a portrait, and not so
        // large that the opening line leaves the first screen.
        expect(
          document.querySelectorAll('[data-visual-role="opening"]'),
        ).toHaveLength(1);
        const opening = openingArt().getBoundingClientRect();
        expect(opening.width).toBeGreaterThan(PORTRAIT_PX);
        expect(opening.height).toBeLessThanOrEqual(viewport.height / 2);

        // Each reply: a circular portrait beside the construct's name, after
        // the message, which has none.
        const portrait = reply.getByRole("img", { name: construct.name });
        await expect.element(portrait).toBeVisible();
        const circle = portrait.element().getBoundingClientRect();
        expect([circle.width, circle.height]).toEqual([
          PORTRAIT_PX,
          PORTRAIT_PX,
        ]);
        expect(getComputedStyle(portrait.element()).borderRadius).toBe("50%");
        const name = reply
          .getByText(construct.name, { exact: true })
          .element()
          .getBoundingClientRect();
        expect(name.left).toBeGreaterThanOrEqual(circle.right);
        expect(name.top).toBeLessThan(circle.bottom);
        expect(name.bottom).toBeGreaterThan(circle.top);
        const asked = reply
          .getByText(ASKED, { exact: true })
          .element()
          .getBoundingClientRect();
        expect(asked.bottom).toBeLessThanOrEqual(circle.top);
        // The reply's text is not indented past the portrait.
        expect(
          reply.getByText(ANSWER).element().getBoundingClientRect().left,
        ).toBe(asked.left);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
          viewport.width,
        );

        // A later turn adds a portrait for its reply and no illustration.
        await screen.rerender(
          view(construct, [...HISTORY, sentMessage(AGAIN, ANSWER, AUTHOR)]),
        );
        await expect
          .element(page.getByText(AGAIN, { exact: true }))
          .toBeVisible();
        expect(
          page.getByRole("img", { name: construct.name }).elements(),
        ).toHaveLength(2);
        expect(
          document.querySelectorAll('[data-visual-role="opening"]'),
        ).toHaveLength(1);
        expect(motions()).toEqual([]);
      });
    }
  }

  for (const { id, motion } of CONSTRUCTS) {
    for (const ending of ["arrives", "fails"] as const) {
      test(`${id} moves only while a reply is coming, and settles when it ${ending}`, async () => {
        const construct = getConstruct(id);
        await render(view(construct, []));
        expect(motions()).toEqual([]);
        const reply = await sendAndWait(ASKED);
        // The coming reply shows the construct and readable busy text.
        await expect
          .element(working)
          .toHaveTextContent(PERFORMANCE_COPY.working);
        await expect
          .element(page.getByText(construct.name, { exact: true }))
          .toBeVisible();
        expect(motions()).toEqual([motion]);

        if (ending === "arrives") {
          reply.resolve(undefined);
        } else {
          reply.reject(new Error("The reply could not be saved"));
        }
        await expect.element(working).not.toBeInTheDocument();
        expect(motions()).toEqual([]);
      });
    }

    test(`${id} stays still with reduced motion, and says a reply is coming`, async () => {
      await commands.reduceMotion(true);
      const construct = getConstruct(id);
      await render(view(construct, []));
      const reply = await sendAndWait(ASKED);
      await expect.element(working).toHaveTextContent(PERFORMANCE_COPY.working);
      expect(motions()).toEqual([]);
      reply.resolve(undefined);
      await expect.element(working).not.toBeInTheDocument();
    });
  }
});

describe("the message composer", () => {
  test("shows the message while its reply comes, with MessageComposer and Stop off, then clears", async () => {
    await render(view(getConstruct("lumen"), []));
    await expect.element(send).toBeDisabled();
    const reply = await sendAndWait(ASKED);
    expect(sendMessageAction).toHaveBeenCalledWith({
      questId: QUEST_ID,
      performanceId: PERFORMANCE.id,
      text: ASKED,
      id: expect.any(String),
    });
    await expect.element(page.getByText(ASKED, { exact: true })).toBeVisible();
    await expect.element(page.getByText(AUTHOR, { exact: true })).toBeVisible();
    await expect.element(composer).toHaveValue("");
    // Typing the next message while waiting can't send it yet.
    await composer.fill(AGAIN);
    await expect.element(send).toBeDisabled();
    await expect
      .element(page.getByRole("button", { name: PERFORMANCE_COPY.stop }))
      .toBeDisabled();
    reply.resolve(undefined);
    await expect.element(working).not.toBeInTheDocument();
    await expect.element(send).toBeEnabled();
    await expect.element(composer).toHaveValue(AGAIN);
    await expect.element(composer).toHaveFocus();
  });

  test("after a failed reply, Retry reply sends the same message and keeps focus in the composer", async () => {
    const screen = await render(view(getConstruct("lumen"), []));
    const failed = await sendAndWait(ASKED);
    failed.reject(new Error("The reply could not be saved"));
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent(PERFORMANCE_COPY.failed);
    await expect.element(composer).toHaveFocus();
    const sent = vi.mocked(sendMessageAction).mock.calls[0]?.[0];
    expect(sent).toBeDefined();

    // The unanswered message survives a reload, with its retry.
    await screen.unmount();
    await render(view(getConstruct("lumen"), []));
    await expect.element(page.getByText(ASKED, { exact: true })).toBeVisible();
    vi.mocked(sendMessageAction).mockResolvedValueOnce(undefined);
    await page.getByRole("button", { name: PERFORMANCE_COPY.retry }).click();
    expect(sendMessageAction).toHaveBeenLastCalledWith(sent);
    await expect
      .element(page.getByRole("button", { name: PERFORMANCE_COPY.retry }))
      .not.toBeInTheDocument();
    await expect.element(composer).toHaveFocus();
  });

  test("when the session has ended, the composer says so and links to sign in", async () => {
    vi.mocked(sendMessageAction).mockResolvedValueOnce(
      PERFORMANCE_COPY.signedOut,
    );
    await render(view(getConstruct("lumen"), []));
    await composer.fill(ASKED);
    await send.click();
    const alert = page.getByRole("alert");
    await expect.element(alert).toBeVisible();
    expect(alert.element().textContent).toContain(PERFORMANCE_COPY.signedOut);
    await expect
      .element(alert.getByRole("link", { name: PERFORMANCE_COPY.signIn }))
      .toHaveAttribute("href", SIGN_IN_PATH);
    await expect
      .element(page.getByRole("button", { name: PERFORMANCE_COPY.retry }))
      .toBeVisible();
  });
});
