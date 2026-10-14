// The signed-in user's own buddies as the New Project form offers them,
// oldest first: their ids and names alone, so no buddy's parts reach the
// browser.
import { requireUser } from "@/auth/current-user.ts";
import { listBuddies, type OwnBuddyChoice } from "@/buddies/buddy-store.ts";

export async function ownBuddyChoices(): Promise<OwnBuddyChoice[]> {
  const user = await requireUser();
  const buddies = await listBuddies(user.id);
  return buddies.map(({ id, name }) => ({ id, name }));
}
