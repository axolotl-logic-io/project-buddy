import type { Metadata } from "next";
import type { JSX } from "react";
import { requireUser } from "@/auth/current-user.ts";
import { interviewConstruct } from "@/constructs/interview-construct.ts";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import { readVapidKeysIfSet } from "@/env.ts";
import { NOTIFICATIONS_COPY, SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { FlagSwitches } from "./flag-switches.tsx";
import { InterviewConstructForm } from "./interview-construct-form.tsx";
import { NotificationSwitch } from "./notification-switch.tsx";

const EXTRAS_HEADING_ID = "extras-heading";
const NOTIFICATIONS_HEADING_ID = "notifications-heading";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// Account preferences and the current device's notification switch.
export default async function SettingsPage(): Promise<JSX.Element> {
  const user = await requireUser();
  const [chosen, constructs] = await Promise.all([
    interviewConstruct(user.id),
    ownConstructChoices(),
  ]);
  const publicKey = readVapidKeysIfSet()?.publicKey;
  return (
    <>
      <h1 className="page-heading">{SETTINGS_COPY.heading}</h1>
      <InterviewConstructForm
        constructId={chosen.id}
        userConstructs={constructs}
      />
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
