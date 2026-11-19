import type { JSX } from "react";
import { expect, test, vi } from "vitest";
import { commands, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ExperienceFeedback } from "@/components/experience/circle-progress.tsx";
import { SignedInHeader } from "@/components/signed-in-header.tsx";
import { type Experience, experienceOf } from "@/experience/experience.ts";
import {
  SIGNED_IN_USER,
  signInAs,
  signOut,
} from "../../auth/current-user-test-kit.ts";
import { readExperience } from "../../experience/experience-store-test-kit.ts";
import { NARROWEST_VIEWPORT, setViewport } from "../../viewports-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../../auth/current-user-test-kit.ts"),
);
vi.mock(
  "@/experience/experience-store.ts",
  () => import("../../experience/experience-store-test-kit.ts"),
);
vi.mock("next/navigation", () => import("../router-test-kit.ts"));

const BEFORE = experienceOf({
  "adding-tasks": 2,
  ideating: 0,
  noting: 0,
  "completing-tasks": 0,
  "completing-quests": 0,
});
const AFTER = experienceOf({ ...BEFORE.points, "completing-tasks": 1 });
const NEXT_CIRCLE = /Circle 2 · Initiate/u;

async function frame(
  experience: Experience,
  route = "Tasks",
): Promise<JSX.Element> {
  readExperience.mockResolvedValueOnce(experience);
  const header = await SignedInHeader({ breadcrumbs: [{ label: route }] });
  return (
    <ExperienceFeedback>
      <div key={route}>{header}</div>
    </ExperienceFeedback>
  );
}

test("celebrates a gain after the header refreshes and updates the circle", async () => {
  await commands.reduceMotion(false);
  signInAs(SIGNED_IN_USER);
  await setViewport(NARROWEST_VIEWPORT);
  const screen = await render(await frame(BEFORE));
  const status = page.getByRole("status");
  expect(status.element()).toBeEmptyDOMElement();

  await screen.rerender(await frame(AFTER, "Quest overview"));
  const message = status.getByText("+3 experience");
  await expect.element(message).toBeInViewport({ ratio: 1 });
  const notice = status.element().firstElementChild;
  expect(notice).toBeInstanceOf(HTMLElement);
  expect(notice && getComputedStyle(notice).animationName).not.toBe("none");
  await expect
    .element(page.getByRole("link", { name: NEXT_CIRCLE }))
    .toHaveAttribute("href", "/profile#experience");

  await screen.rerender(await frame(BEFORE));
  expect(status.element()).toBeEmptyDOMElement();
});

test("shows a still gain with reduced motion and starts fresh after sign-out", async () => {
  await commands.reduceMotion();
  signInAs(SIGNED_IN_USER);
  const screen = await render(await frame(BEFORE));
  await screen.rerender(await frame(AFTER));
  const status = page.getByRole("status");
  await expect.element(status.getByText("+3 experience")).toBeVisible();
  const notice = status.element().firstElementChild;
  expect(notice && getComputedStyle(notice).animationName).toBe("none");

  signOut();
  await screen.rerender(
    <ExperienceFeedback>{await SignedInHeader()}</ExperienceFeedback>,
  );
  expect(status.element()).toBeEmptyDOMElement();
  signInAs(SIGNED_IN_USER);
  await screen.rerender(await frame(AFTER));
  expect(status.element()).toBeEmptyDOMElement();
});
