import {
  type ApiCall,
  apiData,
  apiNotFound,
  apiRoute,
} from "@/api/api-route.ts";
import { findConstructView } from "@/api/definition-views.ts";

interface ConstructParams {
  readonly constructId: string;
}

// A built-in construct.
export const GET = apiRoute(
  async ({ user, params }: ApiCall<ConstructParams>): Promise<Response> => {
    const construct = await findConstructView(user.id, params.constructId);
    if (construct === undefined) {
      return apiNotFound();
    }
    return apiData(construct);
  },
);
