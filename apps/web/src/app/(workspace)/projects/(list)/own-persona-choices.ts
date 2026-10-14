// The signed-in user's own personas as the New Project form offers them,
// oldest first: their ids and names alone, so no persona's parts reach the
// browser.
import { requireUser } from "@/auth/current-user.ts";
import {
  listPersonas,
  type OwnPersonaChoice,
} from "@/personas/persona-store.ts";

export async function ownPersonaChoices(): Promise<OwnPersonaChoice[]> {
  const user = await requireUser();
  const personas = await listPersonas(user.id);
  return personas.map(({ id, name }) => ({ id, name }));
}
