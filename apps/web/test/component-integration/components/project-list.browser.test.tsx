// The projects list in Chromium and WebKit, for "use_case_view_projects":
// each team project carries its mark, "Shared" on the owner's own and
// "Shared with you" on a member's, and the mark is its link's accessible
// description, so moving from link to link announces it. A project no one
// else is in has no mark. Which projects the list holds is the store's
// (team-project-access.server.test.ts).
import { describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ProjectList } from "@/components/project-list.tsx";
import type { Project } from "@/projects/store.ts";
import { PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { projectIdFixture } from "../../support/id-fixtures.ts";
import {
  FOX_PROJECT,
  FOX_PROJECT_AS_MEMBER,
  FOX_TEAM_PROJECT,
} from "../app/(workspace)/page-fixtures.ts";

const OWN_SHARED: Project = { ...FOX_TEAM_PROJECT, name: "Shared fox" };
const MEMBERS: Project = {
  ...FOX_PROJECT_AS_MEMBER,
  id: projectIdFixture("4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a"),
  name: "Their turtle",
};
const ALONE: Project = {
  ...FOX_PROJECT,
  id: projectIdFixture("5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b"),
  name: "Lone donut",
};

describe("use_case_view_projects", () => {
  test("marks the owner's shared project and a member's project, and describes each link by its mark", async () => {
    await render(<ProjectList projects={[OWN_SHARED, MEMBERS, ALONE]} />);

    const cards = page.getByRole("listitem");
    await expect
      .element(page.getByRole("link", { name: OWN_SHARED.name }))
      .toHaveAccessibleDescription(PROJECTS_COPY.shared);
    await expect
      .element(page.getByRole("link", { name: MEMBERS.name }))
      .toHaveAccessibleDescription(PROJECTS_COPY.sharedWithYou);
    await expect
      .element(page.getByRole("link", { name: ALONE.name }))
      .toHaveAccessibleDescription("");
    await expect.element(cards.nth(0)).toMatchTextContent(PROJECTS_COPY.shared);
    await expect
      .element(cards.nth(1))
      .toMatchTextContent(PROJECTS_COPY.sharedWithYou);
    await expect
      .element(cards.nth(2))
      .not.toMatchTextContent(PROJECTS_COPY.shared);
  });
});
