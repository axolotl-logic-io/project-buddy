// The signed-in user's own constructs for creation forms, oldest first:
// ids and names alone, so no construct's parts reach the browser.
import { requireUser } from "@/auth/current-user.ts";
import {
  listConstructs,
  type OwnConstructChoice,
} from "@/constructs/construct-store.ts";

export async function ownConstructChoices(): Promise<OwnConstructChoice[]> {
  const user = await requireUser();
  const constructs = await listConstructs(user.id);
  return constructs.map(({ id, name }) => ({ id, name }));
}
