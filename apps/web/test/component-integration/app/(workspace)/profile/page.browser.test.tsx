import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { setNameAction } from "@/app/(stream)/(site)/(workspace)/profile/actions.ts";
import ProfileLayout from "@/app/(stream)/(site)/(workspace)/profile/layout.tsx";
import ProfilePage from "@/app/(stream)/(site)/(workspace)/profile/page.tsx";
import {
  EVENT_KIND_WEIGHTS,
  experienceOf,
  nextTitleOf,
} from "@/experience/experience.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import {
  MABEL_EXPERIENCE,
  readExperience,
} from "../../../experience/experience-store-test-kit.ts";
import { readSignedInDays } from "../../../visits/signed-in-days-store-test-kit.ts";

const actions = vi.hoisted(() => ({
  setNameAction: vi.fn<typeof setNameAction>(),
}));
vi.mock("@/app/(stream)/(site)/(workspace)/profile/actions.ts", () => actions);
vi.mock("@/auth/current-user.ts", () => ({
  requireUser: vi
    .fn()
    .mockResolvedValue({ id: "user", name: "Mabel", role: "user" }),
}));
vi.mock(
  "@/experience/experience-store.ts",
  () => import("../../../experience/experience-store-test-kit.ts"),
);

beforeEach(() => vi.clearAllMocks());

async function renderProfile(): Promise<void> {
  await render(ProfileLayout({ children: await ProfilePage() }));
}

function renameButton(): ReturnType<typeof page.getByRole> {
  return page.getByRole("button", { name: ACCOUNT_COPY.rename });
}

function nameField(): ReturnType<typeof page.getByRole> {
  return page.getByRole("textbox", { name: ACCOUNT_COPY.nameLabel });
}

test("Profile keeps a refused name's draft and feedback visible beside experience", async () => {
  actions.setNameAction.mockResolvedValue({
    kind: "invalid",
    message: ACCOUNT_COPY.nameMultiLine,
  });
  await renderProfile();
  await renameButton().click();
  const name = nameField();
  await expect.element(name).toHaveFocus();
  await expect.element(name).toHaveValue("Mabel");
  await name.fill("Mabel draft");
  await page
    .getByRole("button", { name: ACCOUNT_COPY.saveName, exact: true })
    .click();
  await expect
    .element(page.getByText(ACCOUNT_COPY.nameMultiLine))
    .toBeVisible();
  await expect.element(name).toHaveValue("Mabel draft");
  await expect
    .element(page.getByRole("region", { name: EXPERIENCE_COPY.heading }))
    .toBeVisible();
});

test("Profile closes the name's form once the name is saved", async () => {
  actions.setNameAction.mockResolvedValue({ kind: "saved" });
  await renderProfile();
  await expect
    .element(page.getByRole("heading", { name: "Mabel" }))
    .toBeVisible();
  await renameButton().click();
  await nameField().fill("Mabel Rose");
  await page
    .getByRole("button", { name: ACCOUNT_COPY.saveName, exact: true })
    .click();
  await expect.element(page.getByText(ACCOUNT_COPY.nameSaved)).toBeVisible();
  await expect.element(nameField()).not.toBeInTheDocument();
  await expect.element(renameButton()).toHaveFocus();
});

test("Profile's Cancel closes the name's form and drops the draft", async () => {
  await renderProfile();
  await renameButton().click();
  await nameField().fill("Someone else");
  await page.getByRole("button", { name: ACCOUNT_COPY.cancelRename }).click();
  await expect.element(nameField()).not.toBeInTheDocument();
  await expect.element(renameButton()).toHaveFocus();
  await renameButton().click();
  await expect.element(nameField()).toHaveValue("Mabel");
  expect(actions.setNameAction).not.toHaveBeenCalled();
});

test("Profile's card shows the user's circle, title, the experience the next circle needs and the next title", async () => {
  await renderProfile();
  const { circle, title, experience, nextCircleStart } = MABEL_EXPERIENCE;
  const card = page.getByRole("region", { name: EXPERIENCE_COPY.heading });
  await expect
    .element(card.getByText(`${EXPERIENCE_COPY.circleLabel} ${circle}`))
    .toBeVisible();
  await expect.element(card.getByText(title, { exact: true })).toBeVisible();
  await expect
    .element(card.getByRole("progressbar"))
    .toHaveAccessibleName(EXPERIENCE_COPY.progressLabel(circle + 1));
  await expect
    .element(card.getByText(EXPERIENCE_COPY.experience(experience)))
    .toBeVisible();
  await expect
    .element(
      card.getByText(
        EXPERIENCE_COPY.toNext(nextCircleStart - experience, circle + 1),
      ),
    )
    .toBeVisible();
  const next = nextTitleOf(circle) ?? { title: "none", circle: 0 };
  await expect
    .element(card.getByText(EXPERIENCE_COPY.nextTitle(next.title, next.circle)))
    .toBeVisible();
});

test("Profile lists events by the experience they earned", async () => {
  await renderProfile();
  const events = page
    .getByRole("region", { name: EXPERIENCE_COPY.eventsLabel })
    .getByRole("listitem");
  // Mabel earned 21 for checking off tasks, 17 for adding and 9 for completing quests.
  const order = ["checking-off", "adding", "completing-quests"] as const;
  await expect.element(events).toHaveLength(order.length);
  expect(events.elements().map((tile) => tile.textContent)).toEqual(
    order.map((event) =>
      expect.stringContaining(EXPERIENCE_COPY.events[event]),
    ),
  );
  const [most] = order;
  await expect
    .element(
      events
        .nth(0)
        .getByText(
          EXPERIENCE_COPY.worth(
            MABEL_EXPERIENCE.counts[most] * EVENT_KIND_WEIGHTS[most],
          ),
        ),
    )
    .toBeVisible();
  await expect
    .element(page.getByText("Most experience", { exact: true }))
    .not.toBeInTheDocument();
});

test("Profile says what an untried event's first point is worth", async () => {
  readExperience.mockResolvedValueOnce(
    experienceOf({ ...MABEL_EXPERIENCE.counts, adding: 0 }),
  );
  await renderProfile();
  const adding = page
    .getByRole("listitem")
    .filter({ hasText: EXPERIENCE_COPY.events.adding });
  await expect
    .element(
      adding.getByText(
        EXPERIENCE_COPY.untried(
          EXPERIENCE_COPY.firstSteps.adding,
          EVENT_KIND_WEIGHTS.adding,
        ),
      ),
    )
    .toBeVisible();
  await expect
    .element(adding.getByText(EXPERIENCE_COPY.worth(0)))
    .not.toBeInTheDocument();
});

vi.mock(
  "@/visits/signed-in-days-store.ts",
  () => import("../../../visits/signed-in-days-store-test-kit.ts"),
);

test.each([0, 1, 24])(
  "Profile shows %i days in its own card with the honest tracking start",
  async (total) => {
    let trackedSince: string | null = "2026-10-20";
    if (total === 0) {
      trackedSince = null;
    }
    readSignedInDays.mockResolvedValueOnce({ total, trackedSince });
    await renderProfile();
    const card = page.getByRole("region", { name: PROFILE_COPY.daysHeading });
    const label = `${total} ${PROFILE_COPY.daysUnit(total)}`;
    await expect.element(card.getByText(label, { exact: true })).toBeVisible();
    await expect
      .element(card.getByText(PROFILE_COPY.daysExplanation))
      .toBeVisible();
    const tracking = PROFILE_COPY.daysTracking(trackedSince);
    await expect.element(card.getByText(tracking)).toBeVisible();
    expect(
      page
        .getByRole("region", { name: EXPERIENCE_COPY.heading })
        .element()
        .contains(card.element()),
    ).toBe(false);
  },
);
