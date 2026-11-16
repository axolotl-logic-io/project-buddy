import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { ExperiencePanel } from "@/components/experience/experience-panel.tsx";
import { readExperience } from "@/experience/experience-store.ts";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";
import { NameForm } from "./name-form.tsx";

export const metadata: Metadata = { title: PROFILE_COPY.title };

// The user's name, which constructs and members see, and their experience.
export default async function ProfilePage(): Promise<JSX.Element> {
  const user = await requireUser();
  const experience = await readExperience(user.id);
  return (
    <div className="workspace-content flex flex-col gap-4">
      <NameForm name={user.name} />
      <ExperiencePanel experience={experience} />
    </div>
  );
}
