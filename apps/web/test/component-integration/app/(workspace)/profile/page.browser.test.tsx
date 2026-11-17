import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { setNameAction } from "@/app/(workspace)/profile/actions.ts";
import ProfileLayout from "@/app/(workspace)/profile/layout.tsx";
import ProfilePage from "@/app/(workspace)/profile/page.tsx";
import {
  ABILITY_WEIGHTS,
  experienceOf,
  nextTitleOf,
} from "@/experience/experience.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";
import {
  MABEL_EXPERIENCE,
  readExperience,
} from "../../../experience/experience-store-test-kit.ts";
import { readSignedInDays } from "../../../visits/signed-in-days-store-test-kit.ts";

const actions = vi.hoisted(() => ({
  setNameAction: vi.fn<typeof setNameAction>(),
}));
vi.mock("@/app/(workspace)/profile/actions.ts", () => actions);
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

test("Profile lists abilities by the experience they earned, the most marked", async () => {
  await renderProfile();
  const abilities = page
    .getByRole("region", { name: EXPERIENCE_COPY.abilitiesLabel })
    .getByRole("listitem");
  // Mabel's abilities, by experience: 7 completed tasks are worth 21, 12
  // added tasks 12, 1 completed quest 9, 4 ideas 4 and 1 Quick Note 1.
  const order = [
    "completing-tasks",
    "adding-tasks",
    "completing-quests",
    "ideating",
    "noting",
  ] as const;
  await expect.element(abilities).toHaveLength(order.length);
  expect(abilities.elements().map((tile) => tile.textContent)).toEqual(
    order.map((ability) =>
      expect.stringContaining(EXPERIENCE_COPY.abilities[ability]),
    ),
  );
  const [most] = order;
  await expect
    .element(abilities.nth(0).getByText(EXPERIENCE_COPY.mostExperience))
    .toBeVisible();
  await expect
    .element(
      abilities
        .nth(0)
        .getByText(
          EXPERIENCE_COPY.worth(
            MABEL_EXPERIENCE.points[most] * ABILITY_WEIGHTS[most],
          ),
        ),
    )
    .toBeVisible();
  await expect
    .element(page.getByText(EXPERIENCE_COPY.mostExperience))
    .toHaveLength(1);
});

test("Profile says what an untried ability's first point is worth", async () => {
  readExperience.mockResolvedValueOnce(
    experienceOf({ ...MABEL_EXPERIENCE.points, noting: 0 }),
  );
  await renderProfile();
  const noting = page
    .getByRole("listitem")
    .filter({ hasText: EXPERIENCE_COPY.abilities.noting });
  await expect
    .element(
      noting.getByText(
        EXPERIENCE_COPY.untried(
          EXPERIENCE_COPY.firstSteps.noting,
          ABILITY_WEIGHTS.noting,
        ),
      ),
    )
    .toBeVisible();
  await expect
    .element(noting.getByText(EXPERIENCE_COPY.worth(0)))
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
    const card = page.getByRole("region", { name: "Days signed in" });
    let label = `${total} days total`;
    if (total === 1) {
      label = "1 day total";
    }
    await expect.element(card.getByText(label, { exact: true })).toBeVisible();
    await expect
      .element(
        card.getByText("Each day you visit while signed in counts once."),
      )
      .toBeVisible();
    let tracking =
      "Tracked since 2026-10-20 · Days use UTC. Earlier days are not included.";
    if (trackedSince === null) {
      tracking =
        "Tracking starts with your first signed-in visit. Days use UTC; earlier days are not included.";
    }
    await expect.element(card.getByText(tracking)).toBeVisible();
    expect(
      page
        .getByRole("region", { name: "Experience" })
        .element()
        .contains(card.element()),
    ).toBe(false);
  },
);
