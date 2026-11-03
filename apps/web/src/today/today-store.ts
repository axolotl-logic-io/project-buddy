// Reads Today (today.ts) for the owner. A chat is active when it starts or
// gains a message; a project is as active as its most active chat. Reading
// makes no model call: the next step is whatever the project's memory
// records. It reads only the projects, chats and memory open to the user:
// their own, and those of team projects they are a member of.
import { and, desc, eq, isNotNull, type SQL, sql } from "drizzle-orm";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
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
import type { Today } from "@/today/today.ts";

// How many projects and other recent chats Today shows at most.
const TODAY_PROJECT_COUNT = 3;
const TODAY_CHAT_COUNT = 3;

// When a `chats` row was last active: its newest message's time, or when it
// started if it has none. The outer query keeps the chat the owner's, and
// with it its messages.
function lastActiveAt(): SQL<Date> {
  return sql`coalesce((select max(${messages.createdAt}) from ${messages} where ${messages.chatId} = ${chats.id}), ${chats.createdAt})`.mapWith(
    chats.createdAt,
  );
}

// The owner's projects with chats, the most recently active first, at most
// limit of them, each with its most recently active chat.
async function activeProjects(
  owner: UserId,
  limit: number,
): Promise<{ project: ChatProject; latestChat: ChatId }[]> {
  const active = lastActiveAt();
  const latestChats = getDb()
    .selectDistinctOn([chats.projectId], {
      projectId: chats.projectId,
      projectName: projects.name,
      chatId: chats.id,
      activeAt: active.as("active_at"),
    })
    .from(chats)
    .innerJoin(projects, eq(chats.projectId, projects.id))
    .where(and(chatOpenTo(owner), isNotNull(chats.projectId)))
    .orderBy(chats.projectId, desc(active), desc(chats.id))
    .as("latest_project_chats");
  const rows = await getDb()
    .select()
    .from(latestChats)
    .orderBy(desc(latestChats.activeAt), desc(latestChats.chatId))
    .limit(limit);
  return rows.flatMap(({ projectId, projectName, chatId }) => {
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
      .select(chatWithProjectColumns(owner))
      .from(chats)
      .leftJoin(projects, eq(chats.projectId, projects.id))
      .where(chatOpenTo(owner))
      .orderBy(desc(active), desc(chats.id))
      .limit(limit),
  );
}

// What is waiting for the owner today.
function readToday(owner: UserId): Promise<Today> {
  return withAppErrors("readToday", async () => {
    const [shown, recentChats] = await Promise.all([
      activeProjects(owner, TODAY_PROJECT_COUNT),
      activeChats(owner, TODAY_PROJECT_COUNT + TODAY_CHAT_COUNT),
    ]);
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

export { readToday };
