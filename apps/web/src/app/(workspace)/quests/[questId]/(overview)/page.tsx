import type { Viewport } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { getQuest } from "@/quests/store.ts";
import { QuestOverview } from "./quest-overview.tsx";

// Resize for the on-screen keyboard so it leaves the composer visible.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default async function QuestPage({
  params,
  searchParams,
}: PageProps<"/quests/[questId]">): Promise<JSX.Element> {
  const [{ questId }, { section }, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);
  const quest = await getQuest(user.id, questId);
  if (quest === undefined) {
    notFound();
  }
  return await QuestOverview({ quest, viewer: user.id, section });
}
