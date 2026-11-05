import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { interviewBuddy } from "@/buddies/interview-buddy.ts";
import { ownBuddyChoices } from "@/buddies/own-buddy-choices.ts";
import { BackLink } from "@/components/ui/back-link.tsx";
import { readVapidKeysIfSet } from "@/env.ts";
import { HOME_PATH } from "@/routes.ts";
import { NOTIFICATIONS_COPY, SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { FlagSwitches } from "./flag-switches.tsx";
import { InterviewBuddyForm } from "./interview-buddy-form.tsx";
import { NotificationSwitch } from "./notification-switch.tsx";

const EXTRAS_HEADING_ID = "extras-heading";
const NOTIFICATIONS_HEADING_ID = "notifications-heading";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// Account preferences and the current device's notification switch.
export default async function SettingsPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const [chosen, buddies] = await Promise.all([
    interviewBuddy(user.id),
    ownBuddyChoices(),
  ]);
  const publicKey = readVapidKeysIfSet()?.publicKey;
  return (
    <>
      <BackLink href={HOME_PATH}>{SETTINGS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{SETTINGS_COPY.heading}</h1>
      <InterviewBuddyForm buddyId={chosen.id} userBuddies={buddies} />
      <section
        aria-labelledby={EXTRAS_HEADING_ID}
        className="panel flex flex-col gap-2"
      >
        <h2 className="section-heading" id={EXTRAS_HEADING_ID}>
          {SETTINGS_COPY.extrasHeading}
        </h2>
        <p className="field-hint">{SETTINGS_COPY.extrasHint}</p>
        <FlagSwitches />
      </section>
      {publicKey !== undefined && (
        <section
          aria-labelledby={NOTIFICATIONS_HEADING_ID}
          className="panel flex flex-col gap-2"
        >
          <h2 className="section-heading" id={NOTIFICATIONS_HEADING_ID}>
            {NOTIFICATIONS_COPY.heading}
          </h2>
          <p className="field-hint">{NOTIFICATIONS_COPY.hint}</p>
          <NotificationSwitch publicKey={publicKey} />
        </section>
      )}
    </>
  );
}
