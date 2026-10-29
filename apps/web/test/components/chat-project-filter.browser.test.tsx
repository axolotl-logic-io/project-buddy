import { afterEach, expect, test, vi } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ChatProjectFilter } from "@/components/chat-project-filter.tsx";
import {
  DEFAULT_THEME_ATTRIBUTES,
  MODE_ATTRIBUTE,
  THEME_ATTRIBUTE,
} from "@/themes/theme-choice.ts";
import { THEME_IDS } from "@/themes/themes.ts";
import { projectIdFixture } from "../id-fixtures.ts";
import { focusLook } from "./focus-look-test-kit.ts";
import { tabForward } from "./keyboard-test-kit.ts";

function focusOutlineColor(element: Element): string {
  const probe = document.createElement("span");
  probe.style.outline = "var(--focus-outline)";
  element.append(probe);
  const color = getComputedStyle(probe).outlineColor;
  probe.remove();
  return color;
}

const PROJECT_ID = projectIdFixture();
const MODES = ["light", "dark"];
const BEFORE_LABEL = "Before filter";

interface ControlFocus {
  readonly visible: boolean;
  readonly disabled: boolean;
  readonly outline: string;
  readonly outlineWidth: number;
  readonly outlineOffset: number;
  readonly contractGap: number;
  readonly outlineColor: string;
  readonly expectedColor: string;
}

async function tabToControl(control: Locator): Promise<ControlFocus> {
  await tabForward();
  const element = control.element();
  await vi.waitFor(() => {
    if (document.activeElement !== element) {
      throw new Error("The keyboard did not reach the filter control");
    }
  });
  const look = focusLook(element);
  const style = getComputedStyle(element);
  return {
    outlineColor: style.outlineColor,
    expectedColor: focusOutlineColor(element),
    visible: element.matches(":focus-visible"),
    disabled: element.matches(":disabled"),
    outline: look.outline,
    outlineWidth: Number.parseFloat(style.outlineWidth),
    outlineOffset: Number.parseFloat(style.outlineOffset),
    contractGap: look.contractGap,
  };
}

// The token contrast itself is covered by test/themes/contrast.test.ts.
// Here the actual filter must expose native, keyboard-reachable controls
// with the shared visible focus, in every theme and mode.
afterEach(() => {
  for (const [name, value] of Object.entries(DEFAULT_THEME_ATTRIBUTES)) {
    document.documentElement.setAttribute(name, value);
  }
});

for (const theme of THEME_IDS) {
  for (const mode of MODES) {
    test(`keyboard reaches the filter with visible focus in ${theme} ${mode}`, async () => {
      document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
      document.documentElement.setAttribute(MODE_ATTRIBUTE, mode);
      await render(
        <>
          <button type="button">{BEFORE_LABEL}</button>
          <ChatProjectFilter
            chats={[]}
            projects={[{ id: PROJECT_ID, name: "Apple orchard" }]}
          />
        </>,
      );
      page.getByRole("button", { name: BEFORE_LABEL }).element().focus();
      await userEvent.keyboard("{Shift}");
      const select = await tabToControl(
        page.getByRole("combobox", { name: "Project" }),
      );
      for (const control of [select]) {
        expect(control.outlineColor).toBe(control.expectedColor);
        expect(control.visible).toBe(true);
        expect(control.disabled).toBe(false);
        expect(control.outline).toBe("solid");
        expect(control.outlineWidth).toBeGreaterThan(0);
        expect(control.contractGap).toBeGreaterThan(0);
        expect(control.outlineOffset).toBe(control.contractGap);
      }
    });
  }
}
