import { currentUser } from "@/auth/current-user.ts";
import { AppError, appErrorResponse } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { WORKSHOP_REQUEST } from "@/workshop/protocol.ts";
import { testDraft } from "@/workshop/test-draft.ts";

export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await currentUser();
    if (user === undefined) {
      return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return appErrorResponse("invalid-request", HTTP_STATUS.badRequest);
    }
    const parsed = WORKSHOP_REQUEST.safeParse(body);
    if (!parsed.success) {
      return appErrorResponse("invalid-request", HTTP_STATUS.badRequest);
    }
    return Response.json(await testDraft(user.id, parsed.data, request.signal));
  } catch (error) {
    if (error instanceof AppError) {
      if (error.errorCase === "not-found") {
        return appErrorResponse(error.errorCase, HTTP_STATUS.notFound);
      }
      if (error.errorCase === "out-of-gold") {
        return appErrorResponse(error.errorCase, HTTP_STATUS.tooManyRequests);
      }
      if (error.errorCase === "invalid-request") {
        return appErrorResponse(error.errorCase, HTTP_STATUS.badRequest);
      }
    }
    return appErrorResponse(
      toAppError(error, "Workshop test").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}
