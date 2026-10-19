import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import {
  PartFields,
  ResetPartForms,
} from "@/app/(workspace)/buddies/[buddyId]/part-fields.tsx";
import { type BuddyParts, getBuddy } from "@/buddies/index.ts";
import { HIDE_ATTRIBUTE } from "@/flags/flag-choice.ts";
import { DEFAULT_HIDDEN_FLAGS } from "@/flags/flags.ts";
import { BUDDY_COPY, BUDDY_PARTS_COPY } from "@/ui/copy/buddies.ts";

vi.mock("@/app/(workspace)/buddies/actions.ts", () => ({
  resetBuddyPartAction: vi.fn(),
}));

const SKILLS = [
  {
    key: "brainstorming",
    other: "projectBreakdown",
    flag: "brainstorming",
  },
  {
    key: "projectBreakdown",
    other: "brainstorming",
    flag: "project-breakdown",
  },
] as const;

const PARTS: BuddyParts = {
  ...getBuddy("hippy").parts,
  brainstorming: "Explore {{name}}'s idea.",
  projectBreakdown: "Plan {{name}}'s next steps.",
};

afterEach(() => {
  document.documentElement.removeAttribute(HIDE_ATTRIBUTE);
});

function savedForm(): FormData {
  const form = document.querySelector("form");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("The buddy save form is missing");
  }
  return new FormData(form);
}

test.each(SKILLS)(
  "$key hides only its editor and reset, retaining submitted text",
  async ({ key, other, flag }) => {
    document.documentElement.setAttribute(
      HIDE_ATTRIBUTE,
      DEFAULT_HIDDEN_FLAGS.join(" "),
    );
    await render(
      <>
        <form>
          <PartFields editable={true} parts={PARTS} />
        </form>
        <ResetPartForms buddyId="own-buddy" />
      </>,
    );
    const editor = page.getByRole("textbox", {
      name: BUDDY_PARTS_COPY[key].label,
      exact: true,
    });
    const reset = page.getByRole("button", {
      name: BUDDY_COPY.resetLabel(BUDDY_PARTS_COPY[key].label),
    });
    const otherEditor = page.getByRole("textbox", {
      name: BUDDY_PARTS_COPY[other].label,
      exact: true,
    });
    const otherReset = page.getByRole("button", {
      name: BUDDY_COPY.resetLabel(BUDDY_PARTS_COPY[other].label),
    });

    await expect.element(editor).toBeVisible();
    await expect.element(reset).toBeVisible();
    // Role locators exclude hidden controls. Keep the actual nodes to check
    // visibility after the switch, rather than waiting to find a visible role.
    const editorElement = editor.element();
    const resetElement = reset.element();
    document.documentElement.setAttribute(
      HIDE_ATTRIBUTE,
      [...DEFAULT_HIDDEN_FLAGS, flag].join(" "),
    );
    await expect.element(editorElement).not.toBeVisible();
    await expect.element(resetElement).not.toBeVisible();
    await expect.element(otherEditor).toBeVisible();
    await expect.element(otherReset).toBeVisible();
    await page
      .getByRole("textbox", { name: BUDDY_PARTS_COPY.voice.label, exact: true })
      .fill("Edited voice");
    expect(savedForm().get(key)).toBe(PARTS[key]);
    expect(savedForm().get(other)).toBe(PARTS[other]);
    expect(savedForm().get("voice")).toBe("Edited voice");

    document.documentElement.setAttribute(
      HIDE_ATTRIBUTE,
      DEFAULT_HIDDEN_FLAGS.join(" "),
    );
    await expect.element(editor).toBeVisible();
    await expect.element(editor).toHaveValue(PARTS[key]);
    await expect.element(reset).toBeVisible();
    await expect.element(otherEditor).toHaveValue(PARTS[other]);
  },
);
