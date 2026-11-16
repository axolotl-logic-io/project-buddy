import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import SettingsLayout from "@/app/(workspace)/settings/layout.tsx";
import SettingsPage from "@/app/(workspace)/settings/page.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";

const actions = vi.hoisted(() => ({
  signOutAction: vi.fn(),
  signOutEverywhereAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/settings/actions.ts", () => actions);

beforeEach(() => vi.clearAllMocks());

test("Settings shows appearance and security together, with no name field", async () => {
  await render(SettingsLayout({ children: SettingsPage() }));
  await expect
    .element(page.getByRole("heading", { name: WORKSPACES_COPY.appearance }))
    .toBeVisible();
  await expect
    .element(page.getByRole("radio", { name: THEME_COPY.modes.dark }))
    .toBeVisible();
  await expect
    .element(
      page.getByRole("button", { name: ACCOUNT_COPY.signOut, exact: true }),
    )
    .toBeVisible();
  await expect
    .element(page.getByRole("textbox", { name: ACCOUNT_COPY.nameLabel }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole("tab")).not.toBeInTheDocument();
});
