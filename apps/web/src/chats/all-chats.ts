// The chats page's list (/chat): the owner's chats in her projects and in no
// project together, each as getChat (src/chats/store.ts) finds it, so a
// project chat carries its project's name.
import { and, desc, eq, type SQL } from "drizzle-orm";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import {
  type FoundChat,
  foundChatColumns,
  toChats,
  toFoundChat,
} from "@/chats/chat-rows.ts";
import { getDb } from "@/db/client.ts";
import { chats, projects } from "@/db/tables/projects-and-chats.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import type { ProjectId, UserId } from "@/ids.ts";

// A `chats` row in the project, or any row when there is no project.
function inProject(projectId: ProjectId | undefined): SQL | undefined {
  if (projectId === undefined) {
    return undefined;
  }
  return eq(chats.projectId, projectId);
}

// The owner's chats, project chats and central chats together, newest first
// as listCentralChats (src/chats/central-chat.ts) orders them. With a project
// id, only that project's chats, and none if the project is another user's.
// The join only reads the project's columns; chatOwnedBy is what keeps the
// chats the owner's.
function listAllChats(
  owner: UserId,
  projectId?: ProjectId,
): Promise<FoundChat[]> {
  return withAppErrors("listAllChats", async () =>
    toChats(
      await getDb()
        .select(foundChatColumns)
        .from(chats)
        .leftJoin(projects, eq(chats.projectId, projects.id))
        .where(and(chatOwnedBy(owner), inProject(projectId)))
        .orderBy(desc(chats.createdAt), desc(chats.id)),
    ).flatMap((chat) => toFoundChat(chat) ?? []),
  );
}

export { listAllChats };
