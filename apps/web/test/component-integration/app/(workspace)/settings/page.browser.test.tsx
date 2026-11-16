import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import SettingsLayout from "@/app/(workspace)/settings/layout.tsx";
import SettingsPage from "@/app/(workspace)/settings/page.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import { WORKSPACES_COPY } from "@/ui/copy/workspaces.ts";
import {
  SIGNED_IN_USER,
  SIGNED_OUT_REDIRECT,
  signInAs,
  signOut,
} from "../../../auth/current-user-test-kit.ts";

const actions = vi.hoisted(() => ({
  signOutAction: vi.fn(),
  signOutEverywhereAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/settings/actions.ts", () => actions);
vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
});

test("Settings shows appearance and security together, with no name field", async () => {
  await render(SettingsLayout({ children: await SettingsPage() }));
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

test("Settings sends a signed-out visitor to sign in", async () => {
  signOut();
  await expect(SettingsPage()).rejects.toThrow(SIGNED_OUT_REDIRECT);
});
