import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { AbilityTiles } from "@/components/experience/ability-tiles.tsx";
import { ExperienceCard } from "@/components/experience/experience-card.tsx";
import { readExperience } from "@/experience/experience-store.ts";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import { NameForm } from "./name-form.tsx";

export const metadata: Metadata = { title: PROFILE_COPY.title };

// The user's name, which constructs and members see, on a card with their
// circle and experience, above their abilities.
export default async function ProfilePage(): Promise<JSX.Element> {
  const user = await requireUser();
  const experience = await readExperience(user.id);
  return (
    <div className="workspace-content flex flex-col gap-6">
      <ExperienceCard experience={experience}>
        <NameForm name={user.name} />
      </ExperienceCard>
      <AbilityTiles points={experience.points} />
    </div>
  );
}
