import type { Metadata } from "next";
import type { JSX } from "react";
import { BackLink } from "@/components/ui/back-link.tsx";
import { readVapidKeysIfSet } from "@/env.ts";
import { HOME_PATH } from "@/routes.ts";
import { NOTIFICATIONS_COPY, SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { FlagSwitches } from "./flag-switches.tsx";
import { NotificationSwitch } from "./notification-switch.tsx";

const EXTRAS_HEADING_ID = "extras-heading";
const NOTIFICATIONS_HEADING_ID = "notifications-heading";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// The user's settings: a switch for each extra part of the site, and one
// for notifications on this device. The page is the same for everyone; the
// switches show her choice, as this browser keeps it, once they load.
export default function SettingsPage(): JSX.Element {
  return (
    <>
      <BackLink href={HOME_PATH}>{SETTINGS_COPY.homeLink}</BackLink>
      <h1 className="page-heading">{SETTINGS_COPY.heading}</h1>
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
      <section
        aria-labelledby={NOTIFICATIONS_HEADING_ID}
        className="panel flex flex-col gap-2"
      >
        <h2 className="section-heading" id={NOTIFICATIONS_HEADING_ID}>
          {NOTIFICATIONS_COPY.heading}
        </h2>
        <p className="field-hint">{NOTIFICATIONS_COPY.hint}</p>
        <NotificationSwitch publicKey={readVapidKeysIfSet()?.publicKey} />
      </section>
    </>
  );
}
