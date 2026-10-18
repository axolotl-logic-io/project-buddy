// The chats page's list (/chat): the owner's chats in her projects and in no
// project together, each as getChat (src/chats/store.ts) finds it, so a
// project chat carries its project's name.
import type { FoundChat } from "@/chats/chat-rows.ts";
import type { ProjectId, UserId } from "@/ids.ts";

// The owner's chats, project chats and central chats together, newest first
// as listCentralChats (src/chats/central-chat.ts) orders them. With a project
// id, only that project's chats, and none if the project is another user's.
function listAllChats(
  owner: UserId,
  projectId?: ProjectId,
): Promise<FoundChat[]> {
  // Stub for issue #472: the implementer writes the query.
  return Promise.reject(
    new Error(`listAllChats(${owner}, ${projectId}) is not implemented`),
  );
}

export { listAllChats };
