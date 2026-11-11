// Membership rows saved while quests could be shared (#907). The site no
// longer reads or writes project_members or project_invitations, and keeps
// them only until a later release drops them, so this kit names the tables
// to put back what a quest's former member left behind: their membership
// and the accepted quest invitation that made it. Tests use it to show that
// neither grants any access. The tables cascade from users and projects, so
// the server tests' cleanup deletes these rows with their users.
import type { User } from "@/accounts/users-store.ts";
import { getDb } from "@/db/client.ts";
import { projectInvitations } from "@/db/tables/project-invitations.ts";
import { projectMembers } from "@/db/tables/project-members.ts";
import type { ProjectId } from "@/ids.ts";

// Saves member's membership of owner's project, and the accepted invitation
// owner sent them, as joining a team quest once did.
async function formerMembership(
  owner: User,
  member: User,
  projectId: ProjectId,
): Promise<void> {
  // Only unique: no link opens a quest invitation any more.
  const tokenHash = crypto.randomUUID();
  await getDb().batch([
    getDb().insert(projectInvitations).values({
      projectId,
      inviteeId: member.id,
      inviterId: owner.id,
      tokenHash,
      state: "accepted",
    }),
    getDb().insert(projectMembers).values({ projectId, userId: member.id }),
  ]);
}

export { formerMembership };
