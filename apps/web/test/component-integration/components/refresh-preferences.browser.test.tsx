import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { refreshPreferencesAction } from "@/accounts/refresh-preferences-action.ts";
import { FlagSwitches } from "@/app/(workspace)/settings/flag-switches.tsx";
import { RefreshPreferences } from "@/components/refresh-preferences.tsx";
import { applyHiddenFlags } from "@/flags/flag-choice.ts";
import { extraTag, type FlagId } from "@/flags/flags.ts";
import { FLAG_COPY } from "@/ui/copy/settings.ts";

vi.mock("@/flags/save-hidden-flags-action.ts", () => ({
  saveHiddenFlagsAction: vi.fn(() => Promise.resolve()),
}));
const navigation = vi.hoisted(() => ({
  usePathname: vi.fn(() => "/settings"),
}));
vi.mock("next/navigation", () => navigation);

const TOOL_LINE = "A tool line";

afterEach(() => {
  vi.clearAllMocks();
  applyHiddenFlags([]);
});

test("already-signed-in navigation and returning to the tab apply extras and switches together", async () => {
  applyHiddenFlags([]);
  vi.mocked(refreshPreferencesAction).mockResolvedValue(["tool-lines"]);
  const screen = await render(
    <>
      <RefreshPreferences />
      <FlagSwitches />
      <p {...extraTag("tool-lines")}>{TOOL_LINE}</p>
    </>,
  );
  await expect
    .element(page.getByRole("switch", { name: FLAG_COPY.toolLines.label }))
    .not.toBeChecked();
  await expect.element(page.getByText(TOOL_LINE)).not.toBeVisible();
  vi.mocked(refreshPreferencesAction).mockResolvedValue([]);
  document.dispatchEvent(new Event("visibilitychange"));
  await expect
    .element(page.getByRole("switch", { name: FLAG_COPY.toolLines.label }))
    .toBeChecked();
  await expect.element(page.getByText(TOOL_LINE)).toBeVisible();
  navigation.usePathname.mockReturnValue("/chat");
  vi.mocked(refreshPreferencesAction).mockResolvedValue(["tool-lines"]);
  await screen.rerender(
    <>
      <RefreshPreferences />
      <FlagSwitches />
      <p {...extraTag("tool-lines")}>{TOOL_LINE}</p>
    </>,
  );
  await expect.element(page.getByText(TOOL_LINE)).not.toBeVisible();
});

test("a slow account refresh cannot replace a switch changed locally meanwhile", async () => {
  applyHiddenFlags([]);
  const pending = Promise.withResolvers<FlagId[] | undefined>();
  vi.mocked(refreshPreferencesAction).mockReturnValue(pending.promise);
  await render(
    <>
      <RefreshPreferences />
      <FlagSwitches />
    </>,
  );
  await page
    .getByRole("switch", { name: FLAG_COPY.workingNotes.label })
    .click();
  pending.resolve(["tool-lines"]);
  await pending.promise;
  await expect
    .element(page.getByRole("switch", { name: FLAG_COPY.workingNotes.label }))
    .not.toBeChecked();
  await expect
    .element(page.getByRole("switch", { name: FLAG_COPY.toolLines.label }))
    .toBeChecked();
});
