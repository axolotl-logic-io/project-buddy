import {
  type ApiCall,
  apiItems,
  apiRoute,
  type NoParams,
} from "@/api/api-route.ts";
import { listConstructViews } from "@/api/definition-views.ts";

// The constructs open to the user: the built-ins only.
export const GET = apiRoute(
  async ({ user }: ApiCall<NoParams>): Promise<Response> =>
    apiItems(await listConstructViews(user.id)),
);
