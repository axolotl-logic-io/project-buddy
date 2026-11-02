// What is waiting for the user today, as the landing page's Today section
// shows it: the projects they were most recently active in, each with its
// next step and its latest chat to continue, and their most recent other
// chats. A chat is active when it starts or gains a message; a project is as
// active as its most active chat. Reading it makes no model call: the next
// step is whatever the project's memory records. It reads only the owner's
// projects, chats and memory.
import { and, desc, eq, isNotNull, type SQL, sql } from "drizzle-orm";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import {
  type Chat,
  type ChatProject,
  chatWithProjectColumns,
  toChats,
} from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import {
  type ChatId,
  parseChatId,
  parseProjectId,
  type UserId,
} from "@/ids.ts";
import { readMemory } from "@/memory/memory-store.ts";
import { nextStepOf } from "@/memory/next-step.ts";

// How many projects and other recent chats Today shows at most.
const TODAY_PROJECT_COUNT = 3;
const TODAY_CHAT_COUNT = 3;

// A project the user was recently active in.
interface TodayProject {
  readonly project: ChatProject;
  // The next step its memory records, or undefined if it records none.
  readonly nextStep: string | undefined;
  // Its most recently active chat, to continue in.
  readonly latestChat: ChatId;
}

// What Today shows. Both lists are newest activity first, and a chat that a
// project continues in is not repeated among the chats. Both are empty for a
// user with no chats. Unread check-ins (#609) can join as another list.
interface Today {
  readonly projects: readonly TodayProject[];
  readonly chats: readonly Chat[];
}

// When a `chats` row was last active: its newest message's time, or when it
// started if it has none. The outer query keeps the chat the owner's, and
// with it its messages.
function lastActiveAt(): SQL<Date> {
  return sql`coalesce((select max(${messages.createdAt}) from ${messages} where ${messages.chatId} = ${chats.id}), ${chats.createdAt})`.mapWith(
    chats.createdAt,
  );
}

// Each of the owner's projects with chats, with its most recently active
// chat, the most recently active first.
async function activeProjects(
  owner: UserId,
): Promise<{ project: ChatProject; latestChat: ChatId }[]> {
  const active = lastActiveAt();
  const rows = await getDb()
    .selectDistinctOn([chats.projectId], {
      projectId: chats.projectId,
      projectName: projects.name,
      chatId: chats.id,
      activeAt: active,
    })
    .from(chats)
    .innerJoin(projects, eq(chats.projectId, projects.id))
    .where(and(chatOwnedBy(owner), isNotNull(chats.projectId)))
    .orderBy(chats.projectId, desc(active), desc(chats.id));
  return rows
    .toSorted(
      (left, right) => right.activeAt.getTime() - left.activeAt.getTime(),
    )
    .flatMap(({ projectId, projectName, chatId }) => {
      const id = parseProjectId(projectId ?? "");
      const latestChat = parseChatId(chatId);
      if (id === undefined || latestChat === undefined) {
        return [];
      }
      return [{ project: { id, name: projectName }, latestChat }];
    });
}

// The owner's chats, the most recently active first, at most limit of them.
async function activeChats(owner: UserId, limit: number): Promise<Chat[]> {
  const active = lastActiveAt();
  return toChats(
    await getDb()
      .select(chatWithProjectColumns())
      .from(chats)
      .leftJoin(projects, eq(chats.projectId, projects.id))
      .where(chatOwnedBy(owner))
      .orderBy(desc(active), desc(chats.id))
      .limit(limit),
  );
}

// What is waiting for the owner today.
function readToday(owner: UserId): Promise<Today> {
  return withAppErrors("readToday", async () => {
    const [allProjects, recentChats] = await Promise.all([
      activeProjects(owner),
      activeChats(owner, TODAY_PROJECT_COUNT + TODAY_CHAT_COUNT),
    ]);
    const shown = allProjects.slice(0, TODAY_PROJECT_COUNT);
    const continued = new Set(shown.map(({ latestChat }) => latestChat));
    return {
      projects: await Promise.all(
        shown.map(async (entry) => ({
          ...entry,
          nextStep: nextStepOf(await readMemory(owner, entry.project.id)),
        })),
      ),
      chats: recentChats
        .filter(({ id }) => !continued.has(id))
        .slice(0, TODAY_CHAT_COUNT),
    };
  });
}

// Whether Today has anything to show. A user with no chats has nothing, and
// the landing page shows only the new-chat form.
function hasToday(today: Today): boolean {
  return today.projects.length > 0 || today.chats.length > 0;
}

export type { Today, TodayProject };
export { hasToday, readToday };
