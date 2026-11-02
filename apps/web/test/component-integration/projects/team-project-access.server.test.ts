// Team projects against the test database: a member reads and writes each
// kind of the project's data as its owner does, while a non-member and a
// member who has been removed or has left see nothing of it, exactly as of
// a project that doesn't exist, and take no writes. A member can't take
// the owner's actions.
import { describe, expect, test } from "vitest";
import { listMessages } from "@/chats/store.ts";
import {
  readCheckInFrequency,
  saveCheckInFrequency,
} from "@/check-ins/check-in-store.ts";
import { listGeneratedImages } from "@/images/generation-store.ts";
import {
  addProjectMember,
  leaveProject,
  listProjectMembers,
  removeProjectMember,
} from "@/projects/members-store.ts";
import { getProject } from "@/projects/store.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import {
  ALL_TAKEN,
  deletesBy,
  NONE_TAKEN,
  NOTHING,
  seenBy,
  teamProject,
  writesBy,
} from "./team-project-test-kit.ts";

// The messages the owner's exchange saved: hers and the buddy's reply.
const EXCHANGE_MESSAGES = 2;

describe("use_case_team_project_access", () => {
  test("a member reads every kind of the project's data, as its owner does", async () => {
    const team = await teamProject();

    const [owners, members] = await Promise.all([
      seenBy(team.owner, team),
      seenBy(team.member, team),
    ]);

    expect(members).toEqual(owners);
    expect(members).toMatchObject({
      project: team.project.name,
      listed: true,
      chat: team.chat.id,
      messages: EXCHANGE_MESSAGES,
      image: "image/png",
      generation: team.generationId,
      members: [team.owner.id, team.member.id],
    });
  });

  test("a member writes every kind of the project's data", async () => {
    const team = await teamProject();

    expect(await writesBy(team.member, team)).toEqual(ALL_TAKEN);
    expect(await deletesBy(team.member, team)).toBe("deleted");
    expect(await seenBy(team.owner, team)).toMatchObject({
      messages: EXCHANGE_MESSAGES + 1,
      notes: ["Paint the flippers"],
      milestones: ["Rigged the flippers"],
    });
  });

  test("the project is the owner's and shared, and the member's as a member", async () => {
    const team = await teamProject();

    expect(await getProject(team.owner.id, team.project.id)).toMatchObject({
      role: "owner",
      shared: true,
    });
    expect(await getProject(team.member.id, team.project.id)).toMatchObject({
      role: "member",
      shared: true,
    });
  });

  test("someone who isn't a member sees nothing of the project and writes nothing to it", async () => {
    const [team, outsider] = await Promise.all([teamProject(), testUser()]);
    const before = await seenBy(team.owner, team);

    expect(await seenBy(outsider, team)).toEqual(NOTHING);
    expect(await writesBy(outsider, team)).toEqual(NONE_TAKEN);
    expect(await deletesBy(outsider, team)).not.toBe("deleted");
    expect(await seenBy(team.owner, team)).toEqual(before);
  });

  test("a member can't take the owner's actions", async () => {
    const [team, another] = await Promise.all([teamProject(), testUser()]);
    await addProjectMember(another.id, team.project.id);

    expect(await readCheckInFrequency(team.member.id, team.project.id)).toBe(
      undefined,
    );
    expect(
      await saveCheckInFrequency(team.member.id, team.project.id, "daily"),
    ).toBe(false);
    await removeProjectMember(team.member.id, team.project.id, another.id);

    expect(await readCheckInFrequency(team.owner.id, team.project.id)).toBe(
      "off",
    );
    expect(
      (await listProjectMembers(team.owner.id, team.project.id)).map(
        ({ id }) => id,
      ),
    ).toEqual([team.owner.id, team.member.id, another.id]);
  });

  test("the owner can't join or leave their own project", async () => {
    const team = await teamProject();

    expect(await addProjectMember(team.owner.id, team.project.id)).toBe(false);
    await leaveProject(team.owner.id, team.project.id);

    expect(await getProject(team.owner.id, team.project.id)).toMatchObject({
      role: "owner",
    });
  });

  test("joining twice keeps one membership", async () => {
    const team = await teamProject();
    const [first] = (
      await listProjectMembers(team.owner.id, team.project.id)
    ).filter(({ id }) => id === team.member.id);

    expect(await addProjectMember(team.member.id, team.project.id)).toBe(true);

    const again = (
      await listProjectMembers(team.owner.id, team.project.id)
    ).filter(({ id }) => id === team.member.id);
    expect(again).toEqual([first]);
  });
});

describe("use_case_remove_member", () => {
  test("a removed member sees nothing of the project at once, and their messages stay", async () => {
    const team = await teamProject();
    expect(await writesBy(team.member, team)).toMatchObject({
      message: "inserted",
    });
    expect(await listGeneratedImages(team.member.id)).toHaveLength(1);

    await removeProjectMember(team.owner.id, team.project.id, team.member.id);

    // Their own image generation in the project's chat leaves their gallery.
    expect(await listGeneratedImages(team.member.id)).toEqual([]);
    expect(await seenBy(team.member, team)).toEqual(NOTHING);
    const before = await seenBy(team.owner, team);
    expect(await writesBy(team.member, team)).toEqual(NONE_TAKEN);
    expect(await deletesBy(team.member, team)).not.toBe("deleted");
    expect(await seenBy(team.owner, team)).toEqual(before);
    const texts = (await listMessages(team.owner.id, team.chat.id)).flatMap(
      ({ parts }) =>
        parts.flatMap((part) => {
          if (part.type === "text") {
            return [part.text];
          }
          return [];
        }),
    );
    expect(texts).toContain("Mine");
  });
});

describe("use_case_leave_project", () => {
  test("a member who left sees nothing of the project at once", async () => {
    const team = await teamProject();

    await leaveProject(team.member.id, team.project.id);

    expect(await seenBy(team.member, team)).toEqual(NOTHING);
    expect(await writesBy(team.member, team)).toEqual(NONE_TAKEN);
    expect(
      (await listProjectMembers(team.owner.id, team.project.id)).map(
        ({ id }) => id,
      ),
    ).toEqual([team.owner.id]);
  });
});
