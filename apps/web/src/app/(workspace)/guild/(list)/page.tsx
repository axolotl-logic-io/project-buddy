import type { Metadata } from "next";
import type { JSX } from "react";
import { DeletionFeedback } from "@/components/deletion-feedback.tsx";
import { BackLink } from "@/components/ui/back-link.tsx";
import { HOME_PATH } from "@/routes.ts";
import { GUILD_COPY } from "@/ui/copy/guild.ts";
import { ConstructLists } from "../construct-lists.tsx";

export const metadata: Metadata = { title: GUILD_COPY.title };

// The Guild: the built-in constructs and her own, each with its actions.
export default async function GuildPage({
  searchParams,
}: PageProps<"/guild">): Promise<JSX.Element> {
  const { deleted } = await searchParams;
  return (
    <>
      <DeletionFeedback completed={deleted === "1"} />
      <BackLink href={HOME_PATH}>{GUILD_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{GUILD_COPY.heading}</h1>
      <p className="text-muted">{GUILD_COPY.intro}</p>
      {await ConstructLists()}
    </>
  );
}
