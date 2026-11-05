// The signed-in user's own constructs for creation forms, oldest first:
// ids, names and visual metadata only; conversational instructions stay private.
import { requireUser } from "@/auth/current-user.ts";
import {
  listConstructs,
  type OwnConstructChoice,
} from "@/constructs/construct-store.ts";

export async function ownConstructChoices(): Promise<OwnConstructChoice[]> {
  const user = await requireUser();
  const constructs = await listConstructs(user.id);
  return constructs.map(({ id, name, definition }) => ({
    id,
    name,
    visual: definition.visual,
  }));
}
