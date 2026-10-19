// The owner's project and standalone chats, with the same details as an
// individual chat lookup. Joins and row conversion stay inside the store.
import { and, desc, eq, getTableColumns, type SQL } from "drizzle-orm";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { type FoundChat, toChats, toFoundChat } from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { chats, projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ProjectId, UserId } from "@/ids.ts";

function inProject(projectId: ProjectId | undefined): SQL | undefined {
  if (projectId === undefined) {
    return undefined;
  }
  return eq(chats.projectId, projectId);
}

// Every chat of the owner's, newest first by creation time and then id.
// An owned project filter returns only that project's chats; a foreign or
// nonexistent project returns none. Standalone chats have no project name.
function listAllChats(
  owner: UserId,
  projectId?: ProjectId,
): Promise<FoundChat[]> {
  return withAppErrors("listAllChats", async () =>
    toChats(
      await getDb()
        .select({
          ...getTableColumns(chats),
          projectName: projects.name,
          projectInterviewChatId: projects.interviewChatId,
        })
        .from(chats)
        .leftJoin(projects, eq(chats.projectId, projects.id))
        .where(and(chatOwnedBy(owner), inProject(projectId)))
        .orderBy(desc(chats.createdAt), desc(chats.id)),
    ).flatMap((chat) => toFoundChat(chat) ?? []),
  );
}

export { listAllChats };
