// Who sees whose email address in a team project, in the test database:
// the owner sees everyone's, with their names; a member sees names, and the
// address only of someone with no name, so they can still tell who it is.
// The rule holds in what the members store returns and so in the project
// page the server renders: a member's page holds no named person's address.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { saveUserName, type User } from "@/accounts/users-store.ts";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import type { ProjectId } from "@/ids.ts";
import {
  addProjectMember,
  listProjectMembers,
} from "@/projects/members-store.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

// A team project whose owner and first member have names, and whose second
// member has none.
interface NamedTeam {
  readonly projectId: ProjectId;
  readonly owner: User;
  readonly named: User;
  readonly unnamed: User;
}

async function namedTeam(): Promise<NamedTeam> {
  const [owner, named, unnamed] = await Promise.all([
    testUser(),
    testUser(),
    testUser(),
  ]);
  await Promise.all([
    saveUserName(owner.id, "Olive"),
    saveUserName(named.id, "Max"),
  ]);
  const project = await testData(owner).project();
  await addProjectMember(named.id, project.id);
  await addProjectMember(unnamed.id, project.id);
  return { projectId: project.id, owner, named, unnamed };
}

// The addresses the members store gives user, in the list's order.
async function emailsFor(
  user: User,
  projectId: ProjectId,
): Promise<(string | undefined)[]> {
  return (await listProjectMembers(user.id, projectId)).map(
    ({ email }) => email,
  );
}

// The project's page as the user, signed in, sees it.
async function pageHtml(user: User, projectId: ProjectId): Promise<string> {
  await signIn(user);
  return renderToStaticMarkup(
    await ProjectPage({
      params: Promise.resolve({ projectId }),
      searchParams: Promise.resolve({}),
    }),
  );
}

describe("use_case_team_project_access", () => {
  test("the owner gets everyone's address; a member gets only that of someone with no name", async () => {
    const { projectId, owner, named, unnamed } = await namedTeam();

    expect(await emailsFor(owner, projectId)).toEqual([
      owner.email,
      named.email,
      unnamed.email,
    ]);
    expect(await emailsFor(named, projectId)).toEqual([
      undefined,
      undefined,
      unnamed.email,
    ]);
    expect(await emailsFor(unnamed, projectId)).toEqual([
      undefined,
      undefined,
      unnamed.email,
    ]);
  });

  test("a member's project page holds no named person's address, and the owner's holds everyone's", async () => {
    const { projectId, owner, named, unnamed } = await namedTeam();

    const asMember = await pageHtml(named, projectId);
    expect(asMember).toContain("Olive");
    expect(asMember).not.toContain(owner.email);
    expect(asMember).not.toContain(named.email);
    expect(asMember).toContain(unnamed.email);

    const asOwner = await pageHtml(owner, projectId);
    for (const { email } of [owner, named, unnamed]) {
      expect(asOwner).toContain(email);
    }
  });
});
