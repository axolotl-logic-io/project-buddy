import type { Metadata } from "next";
import Link from "next/link";
import type { JSX } from "react";
import { turnOffCheckInsAction } from "@/app/check-ins/off/actions.ts";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import type { CheckInFrequency } from "@/check-ins/check-in-frequency.ts";
import { readCheckInFrequency } from "@/check-ins/check-in-store.ts";
import {
  type CheckInsOffTarget,
  readCheckInsOffLink,
} from "@/check-ins/check-ins-off-link.ts";
import { Button } from "@/components/ui/button.tsx";
import { getProject, type Project } from "@/projects/store.ts";
import { HOME_PATH } from "@/routes.ts";
import { CHECK_INS_OFF_COPY, type QuestSentence } from "@/ui/copy/check-ins.ts";

// The project a link names, with its check-in frequency now, or undefined
// if the link isn't signed or the project is gone.
async function linkedProject(
  parameters: Parameters<typeof readCheckInsOffLink>[0],
): Promise<
  | {
      readonly target: CheckInsOffTarget;
      readonly project: Project;
      readonly frequency: CheckInFrequency | undefined;
    }
  | undefined
> {
  const target = await readCheckInsOffLink(parameters);
  if (target === undefined) {
    return undefined;
  }
  const [project, frequency] = await Promise.all([
    getProject(target.owner, target.projectId),
    readCheckInFrequency(target.owner, target.projectId),
  ]);
  if (project === undefined) {
    return undefined;
  }
  return { target, project, frequency };
}

// A sentence that names a quest, with the quest's name in semibold.
function NamingQuest({
  sentence: { before, quest, after },
}: {
  readonly sentence: QuestSentence;
}): JSX.Element {
  return (
    <>
      {before}
      <strong className="font-semibold">{quest}</strong>
      {after}
    </>
  );
}

// The way on from the page, where there is nothing left to do on it.
function OnwardLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: string;
}): JSX.Element {
  return (
    <Button asChild={true} variant="secondary">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export const metadata: Metadata = { title: CHECK_INS_OFF_COPY.title };

// The page a check-in email's link to turn check-ins off opens, signed in
// or not. Opening it changes nothing, so a mail scanner that opens the link
// leaves check-ins on; the user confirms to turn them off, and the page
// then links to the quest. A link that isn't signed, or whose project is
// gone, says so and links to Home.
export default async function CheckInsOffPage({
  searchParams,
}: PageProps<"/check-ins/off">): Promise<JSX.Element> {
  const { user, project, token } = await searchParams;
  const linked = await linkedProject({ user, project, token });
  if (linked === undefined) {
    return (
      <SignInPanel intro={CHECK_INS_OFF_COPY.unusable}>
        <OnwardLink href={HOME_PATH}>{CHECK_INS_OFF_COPY.homeLink}</OnwardLink>
      </SignInPanel>
    );
  }
  if (linked.frequency === "off") {
    return (
      <SignInPanel
        intro={
          <NamingQuest
            sentence={CHECK_INS_OFF_COPY.done(linked.project.name)}
          />
        }
      >
        <OnwardLink href={`/projects/${linked.project.id}`}>
          {CHECK_INS_OFF_COPY.questLink}
        </OnwardLink>
      </SignInPanel>
    );
  }
  return (
    <SignInPanel
      intro={
        <NamingQuest sentence={CHECK_INS_OFF_COPY.intro(linked.project.name)} />
      }
    >
      <form action={turnOffCheckInsAction} className="flex flex-col">
        <input name="user" type="hidden" value={linked.target.owner} />
        <input name="project" type="hidden" value={linked.target.projectId} />
        <input name="token" type="hidden" value={String(token)} />
        <Button type="submit">{CHECK_INS_OFF_COPY.confirm}</Button>
      </form>
    </SignInPanel>
  );
}
