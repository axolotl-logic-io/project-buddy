// "use_case_turn_off_check_ins_from_email" in Chromium and WebKit: the page
// the check-in email's link opens. It names the quest in semibold, and once
// check-ins are off, or when the link doesn't work, it links onward. What
// turning them off saves is check-ins.server.test.ts's.
import { afterEach, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import CheckInsOffPage from "@/app/check-ins/off/page.tsx";
import type { CheckInFrequency } from "@/check-ins/check-in-frequency.ts";
import type { readCheckInFrequency } from "@/check-ins/check-in-store.ts";
import type { readCheckInsOffLink } from "@/check-ins/check-ins-off-link.ts";
import type { getProject } from "@/projects/store.ts";
import { HOME_PATH } from "@/routes.ts";
import { CHECK_INS_OFF_COPY } from "@/ui/copy/check-ins.ts";
import { SIGNED_IN_USER } from "../../../auth/current-user-test-kit.ts";
import { FOX_PROJECT } from "../../(workspace)/page-fixtures.ts";

const stores = vi.hoisted(() => ({
  getProject: vi.fn<typeof getProject>(),
  readCheckInFrequency: vi.fn<typeof readCheckInFrequency>(),
  readCheckInsOffLink: vi.fn<typeof readCheckInsOffLink>(),
}));
vi.mock("@/projects/store.ts", () => ({ getProject: stores.getProject }));
vi.mock("@/check-ins/check-in-store.ts", () => ({
  readCheckInFrequency: stores.readCheckInFrequency,
}));
vi.mock("@/check-ins/check-ins-off-link.ts", () => ({
  readCheckInsOffLink: stores.readCheckInsOffLink,
}));
vi.mock("@/app/check-ins/off/actions.ts", () => ({
  turnOffCheckInsAction: vi.fn(),
}));

const SEMIBOLD = "600";

// The page for a signed link to the fox quest, whose check-ins are at
// frequency, or for a link that isn't signed when signed is false.
async function renderPage(
  frequency: CheckInFrequency | undefined,
  signed = true,
): Promise<void> {
  let target: Awaited<ReturnType<typeof readCheckInsOffLink>>;
  if (signed) {
    target = { owner: SIGNED_IN_USER.id, projectId: FOX_PROJECT.id };
  }
  stores.readCheckInsOffLink.mockResolvedValue(target);
  stores.getProject.mockResolvedValue(FOX_PROJECT);
  stores.readCheckInFrequency.mockResolvedValue(frequency);
  await render(
    await CheckInsOffPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ token: "signed" }),
    }),
  );
}

function questName(): ReturnType<typeof page.getByText> {
  return page.getByText(FOX_PROJECT.name, { exact: true });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("use_case_turn_off_check_ins_from_email", () => {
  test("names the quest in semibold and asks to confirm, with no way on yet", async () => {
    await renderPage("daily");
    const { before, after } = CHECK_INS_OFF_COPY.intro(FOX_PROJECT.name);
    await expect
      .element(page.getByText(`${before}${FOX_PROJECT.name}${after}`))
      .toBeVisible();
    await expect.element(questName()).toBeVisible();
    expect(getComputedStyle(questName().element()).fontWeight).toBe(SEMIBOLD);
    await expect
      .element(page.getByRole("button", { name: CHECK_INS_OFF_COPY.confirm }))
      .toBeVisible();
    await expect.element(page.getByRole("link")).not.toBeInTheDocument();
  });

  test("once check-ins are off, names the quest in semibold and links to it", async () => {
    await renderPage("off");
    const { before, after } = CHECK_INS_OFF_COPY.done(FOX_PROJECT.name);
    await expect
      .element(page.getByText(`${before}${FOX_PROJECT.name}${after}`))
      .toBeVisible();
    expect(getComputedStyle(questName().element()).fontWeight).toBe(SEMIBOLD);
    await expect
      .element(page.getByRole("link", { name: CHECK_INS_OFF_COPY.questLink }))
      .toHaveAttribute("href", `/projects/${FOX_PROJECT.id}`);
    await expect
      .element(page.getByRole("button", { name: CHECK_INS_OFF_COPY.confirm }))
      .not.toBeInTheDocument();
  });

  test("a link that doesn't work says so and links to Home", async () => {
    await renderPage(undefined, false);
    await expect
      .element(page.getByText(CHECK_INS_OFF_COPY.unusable))
      .toBeVisible();
    await expect
      .element(page.getByRole("link", { name: CHECK_INS_OFF_COPY.homeLink }))
      .toHaveAttribute("href", HOME_PATH);
    await expect
      .element(page.getByRole("button", { name: CHECK_INS_OFF_COPY.confirm }))
      .not.toBeInTheDocument();
  });
});
