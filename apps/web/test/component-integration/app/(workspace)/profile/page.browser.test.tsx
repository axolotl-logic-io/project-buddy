import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { setNameAction } from "@/app/(workspace)/profile/actions.ts";
import ProfileLayout from "@/app/(workspace)/profile/layout.tsx";
import ProfilePage from "@/app/(workspace)/profile/page.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";
import { MABEL_EXPERIENCE } from "../../../experience/experience-store-test-kit.ts";

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

test("Profile keeps a refused name's draft and feedback visible beside experience", async () => {
  actions.setNameAction.mockResolvedValue({
    kind: "invalid",
    message: ACCOUNT_COPY.nameMultiLine,
  });
  await render(ProfileLayout({ children: await ProfilePage() }));
  const name = page.getByRole("textbox", { name: ACCOUNT_COPY.nameLabel });
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

test("Profile shows the user's circle, the experience the next one needs and each ability's points", async () => {
  await render(ProfileLayout({ children: await ProfilePage() }));
  const { circle, title, experience, nextCircleStart, points } =
    MABEL_EXPERIENCE;
  const section = page.getByRole("region", {
    name: EXPERIENCE_COPY.heading,
  });
  await expect
    .element(section.getByText(EXPERIENCE_COPY.circle(circle, title)))
    .toBeVisible();
  await expect
    .element(
      section.getByText(
        EXPERIENCE_COPY.standing(
          experience,
          nextCircleStart - experience,
          circle + 1,
        ),
      ),
    )
    .toBeVisible();
  const abilities = section.getByRole("definition");
  await expect
    .element(abilities.nth(0))
    .toHaveTextContent(EXPERIENCE_COPY.points(points["adding-tasks"]));
  await expect
    .element(abilities.nth(-1))
    .toHaveTextContent(EXPERIENCE_COPY.points(points["completing-quests"]));
});
