import { readCronSecretIfSet } from "@/env.ts";

// Whether check-ins are on for the site: only once CRON_SECRET is set, so
// the scheduler can start them. Until then the project page hides their
// setting and the setting's action refuses to save.
export function checkInsAreOn(): boolean {
  return readCronSecretIfSet() !== undefined;
}
