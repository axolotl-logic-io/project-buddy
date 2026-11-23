import type { Viewport } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { questPage } from "./quest-page.tsx";

// The keyboard shrinks the viewport so the performance composer stays reachable.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default async function QuestPage({
  params,
  searchParams,
}: PageProps<"/quests/[questId]">): Promise<JSX.Element> {
  const [{ questId }, { section, performance }, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);
  const page = await questPage(user, questId, section, performance);
  if (page === undefined) {
    notFound();
  }
  return page;
}
