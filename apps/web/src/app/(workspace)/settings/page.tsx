import type { Metadata } from "next";
import type { JSX } from "react";
import { BackLink } from "@/components/ui/back-link.tsx";
import { HOME_PATH } from "@/routes.ts";
import { SETTINGS_COPY } from "@/ui/copy/settings.ts";
import { FlagSwitches } from "./flag-switches.tsx";

const EXTRAS_HEADING_ID = "extras-heading";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// The user's settings: a switch for each extra part of the site. The page is
// the same for everyone; the switches show her choice, as this browser
// keeps it, once they load.
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
    </>
  );
}
