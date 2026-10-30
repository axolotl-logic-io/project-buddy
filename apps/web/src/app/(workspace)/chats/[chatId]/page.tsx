import type { Viewport } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { choicesForChat } from "@/activities/activity-choice.ts";
import { activityChoices } from "@/activities/activity-choices.ts";
import { currentActivity } from "@/activities/activity-sessions.ts";
import { requireUser } from "@/auth/current-user.ts";
import { getChat, listMessages } from "@/chats/store.ts";
import { ChatScreen } from "@/components/chat-screen.tsx";

// An on-screen keyboard shrinks the page rather than covering its bottom, so
// the pinned header and the composer both stay above it. Other pages keep
// the browser's default.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

// One of the user's chats, in a project or standalone, by its id, with its
// current activity; not found if the chat is unknown or another user's.
export default async function ChatPage({
  params,
}: PageProps<"/chats/[chatId]">): Promise<JSX.Element> {
  const { chatId } = await params;
  const user = await requireUser();
  const chat = await getChat(user.id, chatId);
  if (chat === undefined) {
    notFound();
  }
  const [messages, activity, choices] = await Promise.all([
    listMessages(user.id, chat.id),
    currentActivity(user.id, chat),
    activityChoices(user.id),
  ]);
  return (
    <ChatScreen
      activities={choicesForChat(choices, {
        hasProject: chat.project !== undefined,
      })}
      activity={activity}
      chat={chat}
      messages={messages}
    />
  );
}
