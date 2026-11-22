import {
  type ApiCall,
  apiData,
  apiNotFound,
  apiRoute,
} from "@/api/api-route.ts";
import { readRite } from "@/rites/rite-store.ts";

interface RiteParams {
  readonly riteId: string;
}

export const GET = apiRoute(
  async ({ user, params }: ApiCall<RiteParams>): Promise<Response> => {
    const rite = await readRite(user.id, params.riteId);
    if (rite === undefined) {
      return apiNotFound();
    }
    return apiData(rite);
  },
);
