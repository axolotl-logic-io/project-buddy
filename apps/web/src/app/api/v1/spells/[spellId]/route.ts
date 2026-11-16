import {
  type ApiCall,
  apiData,
  apiNotFound,
  apiRoute,
} from "@/api/api-route.ts";
import { findSpellView } from "@/api/definition-views.ts";

interface SpellParams {
  readonly spellId: string;
}

// A built-in spell, or one of the user's own.
export const GET = apiRoute(
  async ({ user, params }: ApiCall<SpellParams>): Promise<Response> => {
    const spell = await findSpellView(user.id, params.spellId);
    if (spell === undefined) {
      return apiNotFound();
    }
    return apiData(spell);
  },
);
