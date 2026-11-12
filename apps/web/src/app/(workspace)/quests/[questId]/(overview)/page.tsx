import type { Viewport } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { QuestWorkspace } from "@/components/quest-workspace.tsx";
import { Notice } from "@/components/ui/form-message.tsx";
import { getQuest } from "@/quests/store.ts";
import { QUEST_STATUS_COPY } from "@/ui/copy/quest-status.ts";
import { questConversation } from "./quest-conversation.tsx";

// An on-screen keyboard shrinks the page rather than covering its bottom, so
// the conversation's pinned header and composer both stay above it.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

// A quest's page. Its first section is the quest's one conversation, with
// its composer; the others are its plan and progress timeline.
export default async function QuestPage({
  params,
  searchParams,
}: PageProps<"/quests/[questId]">): Promise<JSX.Element> {
  const { questId } = await params;
  const { section } = await searchParams;
  let current: "conversation" | "plan" | "ideas" | "progress" = "conversation";
  if (section === "plan" || section === "ideas" || section === "progress") {
    current = section;
  }
  const user = await requireUser();
  const quest = await getQuest(user.id, questId);
  if (quest === undefined) {
    notFound();
  }
  let statusNotice: JSX.Element | undefined;
  if (quest.status !== "active") {
    statusNotice = <Notice>{QUEST_STATUS_COPY.effects}</Notice>;
  }
  const conversation = await questConversation(quest, user.id, current);
  return (
    <QuestWorkspace
      quest={quest}
      current={current}
      conversation={conversation.content}
      navigationStart={conversation.portrait}
    >
      {statusNotice}
    </QuestWorkspace>
  );
}
