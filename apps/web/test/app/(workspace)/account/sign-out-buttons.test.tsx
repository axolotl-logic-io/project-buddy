import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  signOutAction,
  signOutEverywhereAction,
} from "@/app/(workspace)/account/actions.ts";
import { SignOutButtons } from "@/app/(workspace)/account/sign-out-buttons.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";

const actions = vi.hoisted(() => ({
  signOutAction: vi.fn<typeof signOutAction>(),
  signOutEverywhereAction: vi.fn<typeof signOutEverywhereAction>(),
}));
vi.mock("@/app/(workspace)/account/actions.ts", () => actions);

// Presses Sign out everywhere, which asks before signing out.
function askToSignOutEverywhere(): HTMLElement {
  fireEvent.click(
    screen.getByRole("button", { name: ACCOUNT_COPY.signOutEverywhere }),
  );
  return screen.getByRole("alertdialog", {
    name: ACCOUNT_COPY.signOutEverywhereTitle,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SignOutButtons", () => {
  test("signs this browser out at once", async () => {
    render(<SignOutButtons />);

    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_COPY.signOut }));

    await vi.waitFor(() => {
      expect(actions.signOutAction).toHaveBeenCalledTimes(1);
    });
    expect(actions.signOutEverywhereAction).not.toHaveBeenCalled();
  });

  test("signs out everywhere once she confirms, saying what it does", async () => {
    render(<SignOutButtons />);
    const dialog = askToSignOutEverywhere();

    expect(dialog).toHaveAccessibleDescription(
      ACCOUNT_COPY.signOutEverywhereDescription,
    );
    expect(actions.signOutEverywhereAction).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: ACCOUNT_COPY.signOutEverywhere,
      }),
    );

    await vi.waitFor(() => {
      expect(actions.signOutEverywhereAction).toHaveBeenCalledTimes(1);
    });
    expect(actions.signOutAction).not.toHaveBeenCalled();
  });

  test("signs nothing out when she cancels", () => {
    render(<SignOutButtons />);
    askToSignOutEverywhere();

    fireEvent.click(screen.getByRole("button", { name: ACCOUNT_COPY.stay }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(actions.signOutEverywhereAction).not.toHaveBeenCalled();
  });
});
