import type { Metadata } from "next";
import type { JSX } from "react";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import { requireUser } from "@/auth/current-user.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { newChatChoices } from "@/chats/new-chat-choices.ts";
import { ChatProjectFilter } from "@/components/chat-project-filter.tsx";
import { NewChatDialog } from "@/components/new-chat-dialog.tsx";
import { NoAdventures } from "@/components/no-adventures.tsx";
import { PageWorkspace } from "@/components/page-workspace.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { PROJECT_ID } from "@/ids.ts";
import { NEW_CHAT_COPY, STANDALONE_CHATS_COPY } from "@/ui/copy/chat.ts";

export const metadata: Metadata = { title: STANDALONE_CHATS_COPY.title };

// The Chats page, for finding a chat again: every chat of hers, newest first,
// with a filter by project. A new chat starts from the "New chat" dialog.
// Before her first chat, the page welcomes her with the dialog's button in
// place of the list and its filters.
export default async function StandaloneChatsPage({
  searchParams,
}: PageProps<"/chat">): Promise<JSX.Element> {
  const { project } = await searchParams;
  const user = await requireUser();
  const [choices, chats] = await Promise.all([
    newChatChoices(user.id),
    listAllChats(user.id),
  ]);
  const { projects } = choices;
  const projectId = PROJECT_ID.safeParse(project).data;
  const selected = projects.find((choice) => choice.id === projectId);
  if (chats.length === 0) {
    // The welcome centres its button, which the heading's would not be.
    return (
      <PageWorkspace title={STANDALONE_CHATS_COPY.heading}>
        <NoAdventures
          action={
            <NewChatDialog
              {...choices}
              selectedActivityId={DEFAULT_ACTIVITY_ID}
              trigger={
                <Button>
                  <Icon name="plus" />
                  {NEW_CHAT_COPY.dialogHeading}
                </Button>
              }
            />
          }
        />
      </PageWorkspace>
    );
  }
  const newChat = (
    <NewChatDialog {...choices} selectedActivityId={DEFAULT_ACTIVITY_ID} />
  );
  return (
    <PageWorkspace title={STANDALONE_CHATS_COPY.heading} action={newChat}>
      <ChatProjectFilter
        key={selected?.id ?? ""}
        projects={projects}
        chats={chats}
        selectedProjectId={selected?.id}
        workspace={true}
      />
    </PageWorkspace>
  );
}
