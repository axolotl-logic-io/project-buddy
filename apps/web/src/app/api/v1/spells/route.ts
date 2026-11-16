import {
  type ApiCall,
  apiItems,
  apiRoute,
  type NoParams,
} from "@/api/api-route.ts";
import { listSpellViews } from "@/api/definition-views.ts";

// The spells open to the user: the built-ins, then their own.
export const GET = apiRoute(
  async ({ user }: ApiCall<NoParams>): Promise<Response> =>
    apiItems(await listSpellViews(user.id)),
);
