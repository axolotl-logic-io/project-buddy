import {
  type ApiCall,
  apiData,
  apiRoute,
  type NoParams,
} from "@/api/api-route.ts";

// The signed-in user, without their session.
export const GET = apiRoute(
  async ({ user }: ApiCall<NoParams>): Promise<Response> =>
    apiData({ id: user.id, name: user.name ?? null, email: user.email }),
);
