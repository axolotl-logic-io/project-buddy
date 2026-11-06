import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { HomeAtlas } from "@/components/home-atlas.tsx";
import { readToday } from "@/today/today-store.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

export const metadata: Metadata = { title: HOME_COPY.title };

export default async function HomePage(): Promise<JSX.Element> {
  const user = await requireUser();
  const today = await readToday(user.id);
  return (
    <HomeAtlas
      latestQuest={today.projects[0]}
      firstVisit={today.projects.length === 0 && today.chats.length === 0}
    />
  );
}
