import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { EventTiles } from "@/components/experience/event-tiles.tsx";
import { ExperienceCard } from "@/components/experience/experience-card.tsx";
import { readExperience } from "@/experience/experience-store.ts";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import { SignedInDaysCard } from "@/visits/signed-in-days-card.tsx";
import { readSignedInDays } from "@/visits/signed-in-days-store.ts";
import { NameForm } from "./name-form.tsx";

export const metadata: Metadata = { title: PROFILE_COPY.title };

// The user's name, which constructs and members see, on a card with their
// circle and experience, followed by their visiting-day total and events.
export default async function ProfilePage(): Promise<JSX.Element> {
  const user = await requireUser();
  const [experience, days] = await Promise.all([
    readExperience(user.id),
    readSignedInDays(user.id),
  ]);
  return (
    <div className="workspace-content flex flex-col gap-6">
      <ExperienceCard experience={experience}>
        <NameForm name={user.name} />
      </ExperienceCard>
      <SignedInDaysCard days={days} />
      <EventTiles counts={experience.counts} />
    </div>
  );
}
