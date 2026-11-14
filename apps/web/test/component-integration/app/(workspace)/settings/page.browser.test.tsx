import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { setNameAction } from "@/app/(workspace)/settings/actions.ts";
import SettingsLayout from "@/app/(workspace)/settings/layout.tsx";
import SettingsPage from "@/app/(workspace)/settings/page.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { INTERVIEW_CONSTRUCT_COPY } from "@/ui/copy/settings.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";

const actions = vi.hoisted(() => ({
  setNameAction: vi.fn<typeof setNameAction>(),
  signOutAction: vi.fn(),
  signOutEverywhereAction: vi.fn(),
}));
vi.mock("@/app/(workspace)/settings/actions.ts", () => actions);
vi.mock("@/app/(workspace)/settings/interview-construct-action.ts", () => ({
  setInterviewConstructAction: vi.fn(),
}));
vi.mock("@/auth/current-user.ts", () => ({
  requireUser: vi
    .fn()
    .mockResolvedValue({ id: "user", name: "Mabel", role: "user" }),
}));
vi.mock("@/constructs/interview-construct.ts", () => ({
  interviewConstruct: vi.fn().mockResolvedValue({ id: "vellum" }),
}));
vi.mock("@/constructs/own-construct-choices.ts", () => ({
  ownConstructChoices: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/gold/gold-store.ts", () => ({
  readGoldBalance: vi.fn().mockResolvedValue(0),
}));

beforeEach(() => vi.clearAllMocks());

test("Settings keeps profile drafts and feedback visible alongside appearance, construct and security", async () => {
  actions.setNameAction.mockResolvedValue({
    kind: "invalid",
    message: ACCOUNT_COPY.nameMultiLine,
  });
  await render(SettingsLayout({ children: await SettingsPage() }));
  const name = page.getByRole("textbox", { name: ACCOUNT_COPY.nameLabel });
  await name.fill("Mabel draft");
  await page
    .getByRole("button", { name: ACCOUNT_COPY.saveName, exact: true })
    .click();
  await expect
    .element(page.getByText(ACCOUNT_COPY.nameMultiLine))
    .toBeVisible();
  await page
    .getByRole("radio", { name: THEME_COPY.modes.dark, exact: true })
    .click();
  await expect.element(name).toHaveValue("Mabel draft");
  await expect
    .element(page.getByText(ACCOUNT_COPY.nameMultiLine))
    .toBeVisible();
  await expect
    .element(
      page.getByRole("heading", { name: INTERVIEW_CONSTRUCT_COPY.heading }),
    )
    .toBeVisible();
  await expect
    .element(
      page.getByRole("button", { name: ACCOUNT_COPY.signOut, exact: true }),
    )
    .toBeVisible();
  await expect.element(page.getByRole("tab")).not.toBeInTheDocument();
});

