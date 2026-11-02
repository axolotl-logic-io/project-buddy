// Each project's check-in schedule, and which projects are due a check-in,
// stored in Postgres beside the project. A project is due when its
// check-ins are on and it has been quiet for its interval: no check-in was
// claimed, no chat started and no message sent in it since then, and no
// earlier check-in waits unread for the project's owner. The interval is a
// little short of its whole days, by CHECK_IN_SLACK_HOURS, so a scheduler
// that runs at about the same hour every day finds a daily check-in due
// though the last ran a few minutes less than a day ago.
import { and, asc, eq, isNull, lt, ne, or, type SQL, sql } from "drizzle-orm";
import { projectOwnedBy } from "@/accounts/owner-scope.ts";
import { unreadForProjectOwner } from "@/chats/unread-marks.ts";
import {
  CHECK_IN_DAYS,
  type CheckInFrequency,
  parseCheckInFrequency,
} from "@/check-ins/check-in-frequency.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { users } from "@/db/tables/users.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ProjectId,
  parseProjectId,
  parseUserId,
  type UserId,
} from "@/ids.ts";

const CHECK_IN_SLACK_HOURS = 1;

// A project due a check-in: its owner, the owner's email address, and the
// project's id and name.
interface DueCheckIn {
  readonly owner: UserId;
  readonly email: string;
  readonly project: { readonly id: ProjectId; readonly name: string };
}

// The project's interval, as SQL: its schedule's days less the slack.
function interval(): SQL {
  const days = sql.join(
    Object.entries(CHECK_IN_DAYS).map(
      ([frequency, count]) => sql`when ${frequency} then ${count}::int`,
    ),
    sql` `,
  );
  return sql`(make_interval(days => case ${projects.checkInFrequency} ${days} end) - make_interval(hours => ${CHECK_IN_SLACK_HOURS}::int))`;
}

// A `projects` row due a check-in now.
function dueNow(): SQL | undefined {
  const quietSince = sql`(now() - ${interval()})`;
  return and(
    ne(projects.checkInFrequency, "off"),
    or(isNull(projects.lastCheckInAt), lt(projects.lastCheckInAt, quietSince)),
    sql`not exists (select 1 from ${chats} where ${chats.projectId} = ${projects.id} and (${chats.createdAt} > ${quietSince} or ${unreadForProjectOwner()}))`,
    sql`not exists (select 1 from ${messages} inner join ${chats} on ${messages.chatId} = ${chats.id} where ${chats.projectId} = ${projects.id} and ${messages.createdAt} > ${quietSince})`,
  );
}

// The owner's project's check-in frequency; undefined if the project is
// unknown or another user's.
async function readCheckInFrequency(
  owner: UserId,
  projectId: ProjectId,
): Promise<CheckInFrequency | undefined> {
  const [row] = await withAppErrors("read check-in frequency", () =>
    getDb()
      .select({ frequency: projects.checkInFrequency })
      .from(projects)
      .where(and(eq(projects.id, projectId), projectOwnedBy(owner))),
  );
  if (row === undefined) {
    return undefined;
  }
  return parseCheckInFrequency(row.frequency) ?? "off";
}

// Sets how often the buddy checks in on the owner's project, and says
// whether the project was found: an unknown project or another user's is
// left alone.
async function saveCheckInFrequency(
  owner: UserId,
  projectId: ProjectId,
  frequency: CheckInFrequency,
): Promise<boolean> {
  const saved = await withAppErrors("save check-in frequency", () =>
    getDb()
      .update(projects)
      .set({ checkInFrequency: frequency })
      .where(and(eq(projects.id, projectId), projectOwnedBy(owner)))
      .returning({ id: projects.id }),
  );
  return saved.length > 0;
}

// The projects due a check-in now, of every user, longest-waiting first,
// at most limit of them. The scheduler is the one reader that
// isn't any user's, so this is the one query here that no owner scopes:
// everything done with what it finds is scoped to the owner it names.
async function listDueCheckIns(limit: number): Promise<DueCheckIn[]> {
  const rows = await withAppErrors("list due check-ins", () =>
    getDb()
      .select({
        id: projects.id,
        name: projects.name,
        userId: projects.userId,
        email: users.email,
      })
      .from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(dueNow())
      .orderBy(sql`${projects.lastCheckInAt} asc nulls first`, asc(projects.id))
      .limit(limit),
  );
  return rows.flatMap(({ id, name, userId, email }) => {
    const projectId = parseProjectId(id);
    const owner = parseUserId(userId);
    if (projectId === undefined || owner === undefined) {
      return [];
    }
    return [{ owner, email, project: { id: projectId, name } }];
  });
}

// Claims the owner's project's next check-in, and says whether it did: of
// two calls at once, at most one claims it, and none does unless the
// project is due now.
async function claimCheckIn(
  owner: UserId,
  projectId: ProjectId,
): Promise<boolean> {
  const claimed = await withAppErrors("claimCheckIn", () =>
    getDb()
      .update(projects)
      .set({ lastCheckInAt: sql`now()` })
      .where(and(eq(projects.id, projectId), projectOwnedBy(owner), dueNow()))
      .returning({ id: projects.id }),
  );
  return claimed.length > 0;
}

// Gives up the claim to the owner's project's check-in, so the next run
// tries again, such as after Claude couldn't write it.
async function releaseCheckIn(
  owner: UserId,
  projectId: ProjectId,
): Promise<void> {
  await withAppErrors("releaseCheckIn", () =>
    getDb()
      .update(projects)
      .set({ lastCheckInAt: null })
      .where(and(eq(projects.id, projectId), projectOwnedBy(owner))),
  );
}

export type { DueCheckIn };
export {
  claimCheckIn,
  listDueCheckIns,
  readCheckInFrequency,
  releaseCheckIn,
  saveCheckInFrequency,
};
