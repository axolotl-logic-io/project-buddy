import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { HomeAtlas } from "@/components/home-atlas.tsx";
import { readHomeSummary } from "@/today/today-store.ts";
import { HOME_COPY } from "@/ui/copy/home.ts";

export const metadata: Metadata = { title: HOME_COPY.title };

export default async function HomePage(): Promise<JSX.Element> {
  const user = await requireUser();
  const summary = await readHomeSummary(user.id);
  return (
    <HomeAtlas
      latestQuest={summary.latestQuest}
      firstVisit={summary.firstVisit}
    />
  );
}
