import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type {
  signOutAction,
  signOutEverywhereAction,
} from "@/app/(workspace)/settings/actions.ts";
import SettingsError from "@/app/(workspace)/settings/error.tsx";
import SettingsLoading from "@/app/(workspace)/settings/loading.tsx";
import { SignOutButtons } from "@/app/(workspace)/settings/sign-out-buttons.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

const actions = vi.hoisted(() => ({
  signOutAction: vi.fn<typeof signOutAction>(),
  signOutEverywhereAction: vi.fn<typeof signOutEverywhereAction>(),
}));
vi.mock("@/app/(workspace)/settings/actions.ts", () => actions);
// Resolves once she has signed out: the Server Action was called. It never
// finishes, as the real one ends in a redirect.
function signingOut(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  actions.signOutAction.mockImplementation((): Promise<never> => {
    resolve();
    return new Promise<never>(() => undefined);
  });
  return promise;
}

const signOut = page.getByRole("button", {
  name: ACCOUNT_COPY.signOut,
  exact: true,
});

afterEach(() => {
  vi.clearAllMocks();
});

test("signing out submits the action", async () => {
  const signedOut = signingOut();
  await render(<SignOutButtons />);
  await signOut.click();
  await signedOut;
  expect(actions.signOutAction).toHaveBeenCalledOnce();
});

test("Settings keeps both sign-out actions while loading or showing a page error", async () => {
  const screen = await render(<SettingsLoading />);
  await expect.element(signOut).toBeVisible();
  await expect
    .element(
      page.getByRole("button", {
        name: ACCOUNT_COPY.signOutEverywhere,
        exact: true,
      }),
    )
    .toBeVisible();
  const retry = vi.fn<() => void>();
  await screen.rerender(
    <SettingsError error={new Error("Balance unavailable")} retry={retry} />,
  );
  await expect.element(signOut).toBeVisible();
  await expect
    .element(
      page.getByRole("button", {
        name: ACCOUNT_COPY.signOutEverywhere,
        exact: true,
      }),
    )
    .toBeVisible();
});
