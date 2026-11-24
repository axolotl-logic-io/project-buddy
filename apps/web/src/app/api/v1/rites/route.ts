import {
  type ApiCall,
  apiItems,
  apiRoute,
  type NoParams,
} from "@/api/api-route.ts";
import { listRites } from "@/rites/rite-store.ts";

export const GET = apiRoute(
  async ({ user }: ApiCall<NoParams>): Promise<Response> =>
    apiItems(await listRites(user.id)),
);
