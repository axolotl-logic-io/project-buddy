import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import AccountPage from "@/app/(workspace)/account/page.tsx";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import type { readMonthlyUsage } from "@/quota/spend-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import {
  SIGNED_IN_USER,
  signInAs,
} from "../../../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../../auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  readMonthlyUsage: vi.fn<typeof readMonthlyUsage>(),
}));
vi.mock("@/quota/spend-store.ts", () => store);

vi.mock("@/app/(workspace)/account/actions.ts", () => ({
  setNameAction: vi.fn(),
}));

const TWO_DOLLARS = 2_000_000;

beforeEach(() => {
  store.readMonthlyUsage.mockResolvedValue({
    spentMicroUsd: TWO_DOLLARS,
    limitMicroUsd: MONTHLY_QUOTA_MICRO_USD,
    resetsOn: new Date("2026-11-01T00:00:00Z"),
  });
});

describe("Account page", () => {
  test("shows her own spend this month", async () => {
    signInAs(SIGNED_IN_USER);

    render(await AccountPage());

    expect(screen.getByRole("meter")).toBeInTheDocument();
    expect(store.readMonthlyUsage).toHaveBeenCalledWith(
      SIGNED_IN_USER.id,
      expect.any(Date),
    );
  });

  test("her name field shows her saved name", async () => {
    signInAs({ ...SIGNED_IN_USER, name: "Mabel" });

    render(await AccountPage());

    expect(
      screen.getByRole("heading", { name: ACCOUNT_COPY.nameHeading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: ACCOUNT_COPY.nameLabel }),
    ).toHaveValue("Mabel");
  });

  test("her name field is empty when she has no name, and says what {{name}} does", async () => {
    signInAs(SIGNED_IN_USER);

    render(await AccountPage());

    const field = screen.getByRole("textbox", { name: ACCOUNT_COPY.nameLabel });
    expect(field).toHaveValue("");
    expect(field).not.toBeRequired();
    expect(field).toHaveAccessibleDescription(
      expect.stringContaining("{{name}}"),
    );
  });
});
