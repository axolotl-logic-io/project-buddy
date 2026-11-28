import type { Viewport } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { QuestNotFound } from "./quest-not-found.tsx";
import { questPage } from "./quest-page.tsx";

// The keyboard shrinks the viewport so the performance composer stays reachable.
export const viewport: Viewport = { interactiveWidget: "resizes-content" };

export default async function QuestPage({
  params,
  searchParams,
}: PageProps<"/quests/[questId]">): Promise<JSX.Element> {
  const [{ questId }, { section, zotero }, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);
  const page = await questPage(user, questId, section, zotero);
  // A missing quest is rendered here rather than thrown with notFound().
  // On a first load the page streams inside the site's loading boundary
  // (src/app/(stream)/loading.tsx), where the server can't render a
  // not-found boundary: notFound() would make it give up the whole
  // boundary to the browser, which logs React error #419.
  if (page === undefined) {
    return <QuestNotFound />;
  }
  return page;
}
