// A user's time zone: an IANA name, such as Europe/Paris. Their quests'
// days start at midnight there (src/lists/quest-today.ts). The site saves a
// name only when Postgres also knows it (saveTimeZone), since every quest
// read converts the time with it.
import { z } from "zod";

const DEFAULT_TIME_ZONE = "UTC";

const TIME_ZONE_MAX_LENGTH = 64;

function isTimeZone(name: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: name }).format(0);
    return true;
  } catch {
    return false;
  }
}

const TIME_ZONE = z
  .string()
  .min(1)
  .max(TIME_ZONE_MAX_LENGTH)
  .refine(isTimeZone);

type TimeZone = z.infer<typeof TIME_ZONE>;

// Every time zone to choose from, UTC first and the rest by name.
function timeZoneChoices(): readonly TimeZone[] {
  return [
    DEFAULT_TIME_ZONE,
    ...Intl.supportedValuesOf("timeZone").filter(
      (name) => name !== DEFAULT_TIME_ZONE,
    ),
  ];
}

function canonicalName(name: string): string {
  return new Intl.DateTimeFormat("en", { timeZone: name }).resolvedOptions()
    .timeZone;
}

// Formats in the time zone this browser or server runs in.
const HERE = new Intl.DateTimeFormat();

// The choice naming the time zone this browser or server runs in, if there
// is one. Engines differ in which of a zone's names they give, such as
// Asia/Calcutta or Asia/Kolkata, so another name of the same zone matches.
function localTimeZone(
  choices: readonly TimeZone[] = timeZoneChoices(),
): TimeZone | undefined {
  const here = HERE.resolvedOptions().timeZone;
  const canonical = canonicalName(here);
  return (
    choices.find((name) => name === here) ??
    choices.find((name) => canonicalName(name) === canonical)
  );
}

export { DEFAULT_TIME_ZONE, localTimeZone, TIME_ZONE, timeZoneChoices };
