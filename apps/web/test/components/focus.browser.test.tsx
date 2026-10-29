// "use_case_choose_theme" in use-cases/appearance.md, in Chromium and
// WebKit: how each theme draws focus, read from the computed styles. The
// buddy picker's bars draw their focus ring inside the picker, whose
// corners would clip one outside; focus draws no filter, which would
// make the element a containing block for its positioned descendants, so a
// link card's overlay still covers the whole card; the message's field box
// shows the message's focus with an outline; and the theme's glow is one
// more layer of the focused element's box-shadow. The keyboard reaches the
// picker's bars by Tab, as she would, so they match :focus-visible.
// test/themes/signed-in-pages.browser.test.tsx covers the signed-in pages
// each theme styles.
import type { JSX } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { getBuddy } from "@/buddies/index.ts";
import { BuddyPicker } from "@/components/buddy-picker.tsx";
import { ChatView } from "@/components/chat-view.tsx";
import { ProjectList } from "@/components/project-list.tsx";
import { THEMES, type ThemeId } from "@/themes/themes.ts";
import { CHAT_COPY, NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { chatIdFixture, projectIdFixture } from "../id-fixtures.ts";
import { applyTheme } from "../themes/theme-test-kit.ts";
import {
  focusLook,
  type ShadowLayer,
  showsGlow,
} from "./focus-look-test-kit.ts";

// ChatView refreshes the page through the App Router.
vi.mock("next/navigation", () => import("./router-test-kit.ts"));

// How far, in pixels, a link card's overlay may be from the card's size.
const OVERLAY_TOLERANCE = 1;

// The button the keyboard starts from, before the element under test.
const BEFORE_LABEL = "Before";

const PROJECT_NAME = "Low-poly fox";

// What a theme shows around a focused element beside its outline: whether
// it glows.
interface FocusShadows {
  readonly glow: boolean;
}

// What each theme draws around focus beside its outline. Only Ghost
// Hasslers glows.
const FOCUS_SHADOWS: Readonly<Record<ThemeId, FocusShadows>> = {
  "gravy-falls": { glow: false },
  "ghost-hasslers": { glow: true },
  "ay-liens": { glow: false },
};

const BEFORE_BUTTON: JSX.Element = (
  <button type="button">{BEFORE_LABEL}</button>
);

// Focuses the button before the element under test from the keyboard.
async function focusBefore(): Promise<void> {
  page.getByRole("button", { name: BEFORE_LABEL }).element().focus();
  await userEvent.keyboard("{Shift}");
}

// Waits for locator to have the keyboard's focus, and returns its element.
async function focused(locator: Locator): Promise<HTMLElement> {
  const node = locator.element();
  if (!(node instanceof HTMLElement)) {
    throw new TypeError("The element is not an HTML element");
  }
  await vi.waitFor(() => {
    if (document.activeElement !== node) {
      throw new Error("The element does not have focus");
    }
  });
  return node;
}

// How a focused element draws its focus, as the tests below compare it with
// what each theme should draw.
interface DrawnFocus {
  readonly focusVisible: boolean;
  readonly filter: string;
  readonly glow: boolean;
}

function drawnFocus(node: Element, box: Element = node): DrawnFocus {
  const look = focusLook(box);
  return {
    focusVisible: node.matches(":focus-visible"),
    filter: look.filter,
    glow: showsGlow(look),
  };
}

// What a theme should draw around a focused element: :focus-visible
// matched, no filter, and the theme's glow.
function expectedFocus(expected: FocusShadows): DrawnFocus {
  return {
    focusVisible: true,
    filter: "none",
    glow: expected.glow,
  };
}

// Tabs from the button before the buddy picker to its first control, the
// bar to the previous buddy, and reads how the bar draws its focus: whether
// it has an outline, and whether the outline lies wholly inside the bar.
async function pickerBarFocus(): Promise<
  DrawnFocus & { readonly outlined: boolean; readonly ringInside: boolean }
> {
  await render(
    <>
      {BEFORE_BUTTON}
      <BuddyPicker />
    </>,
  );
  await focusBefore();
  await userEvent.tab();
  const bar = await focused(
    page.getByRole("button", { name: NEW_CHAT_COPY.previousBuddy }),
  );
  const style = getComputedStyle(bar);
  return {
    ...drawnFocus(bar),
    outlined: focusLook(bar).outline !== "none",
    ringInside:
      Number.parseFloat(style.outlineOffset) +
        Number.parseFloat(style.outlineWidth) <=
      0,
  };
}

// Focuses a project's link card from the keyboard and reads how it draws
// its focus, and how far its overlay is from the card's size. WebKit's Tab
// skips links unless the user turns that on, so the link is focused once
// the keyboard has been used rather than tabbed to.
async function linkCardFocus(): Promise<
  DrawnFocus & { readonly overlayOff: number }
> {
  await render(
    <>
      {BEFORE_BUTTON}
      <ProjectList
        projects={[
          {
            id: projectIdFixture(),
            name: PROJECT_NAME,
            interviewChatId: undefined,
            createdAt: new Date(),
          },
        ]}
      />
    </>,
  );
  await focusBefore();
  const link = page.getByRole("link", { name: PROJECT_NAME });
  link.element().focus();
  const node = await focused(link);
  const after = getComputedStyle(node, "::after");
  const card = node.closest("li");
  return {
    ...drawnFocus(node),
    overlayOff: Math.max(
      Math.abs(Number.parseFloat(after.width) - (card?.clientWidth ?? 0)),
      Math.abs(Number.parseFloat(after.height) - (card?.clientHeight ?? 0)),
    ),
  };
}

// Focuses an open chat's message and reads how its field box draws the
// focus, and the box-shadow the message itself draws.
async function fieldBoxFocus(): Promise<
  DrawnFocus & {
    readonly outlined: boolean;
    readonly controlShadows: readonly ShadowLayer[];
  }
> {
  await render(
    <ChatView
      chatId={chatIdFixture()}
      initialMessages={[]}
      buddyName={getBuddy("mr-tee").name}
    />,
  );
  const control = page.getByRole("textbox", { name: CHAT_COPY.messageLabel });
  control.element().focus();
  const node = await focused(control);
  const box = node.parentElement;
  if (box === null) {
    throw new Error("The message is not in a field box");
  }
  return {
    ...drawnFocus(node, box),
    outlined: focusLook(box).outline !== "none",
    controlShadows: focusLook(node).shadows,
  };
}

describe("use_case_choose_theme", () => {
  for (const { id, name } of THEMES) {
    describe(`the ${name} theme`, () => {
      beforeEach(() => {
        applyTheme(id);
      });

      test("a buddy picker's bar draws its focus ring inside the picker", async () => {
        expect(await pickerBarFocus()).toEqual({
          ...expectedFocus(FOCUS_SHADOWS[id]),
          outlined: true,
          ringInside: true,
        });
      });

      test("a focused link card draws no filter, so its overlay covers the card", async () => {
        const focus = await linkCardFocus();
        expect(focus.overlayOff).toBeLessThanOrEqual(OVERLAY_TOLERANCE);
        expect({ ...focus, overlayOff: 0 }).toEqual({
          ...expectedFocus(FOCUS_SHADOWS[id]),
          overlayOff: 0,
        });
      });

      test("the message's field box shows its focus without a filter", async () => {
        expect(await fieldBoxFocus()).toEqual({
          ...expectedFocus(FOCUS_SHADOWS[id]),
          outlined: true,
          controlShadows: [],
        });
      });
    });
  }
});
