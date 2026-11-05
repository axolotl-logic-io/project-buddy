import { z } from "zod";
import { currentUser } from "@/auth/current-user.ts";
import { VISUAL_DESTINATION } from "@/constructs/visual.ts";
import { getVisualAsset } from "@/constructs/visual-asset-store.ts";
import {
  generateConstructVisual,
  readVisualGeneration,
} from "@/constructs/visual-generation.ts";
import { VISUAL_GENERATION_REQUEST } from "@/constructs/visual-generation-contract.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";

const QUOTE_QUERY = z.object({
  constructId: z.uuid(),
  requestId: z.uuid().optional(),
});
async function postVisualGeneration(request: Request): Promise<Response> {
  try {
    const user = await currentUser();
    if (user === undefined) {
      return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
    }
    const parsed = VISUAL_GENERATION_REQUEST.safeParse(
      await request.json().catch(() => undefined),
    );
    if (!parsed.success) {
      return appErrorResponse("invalid-request", HTTP_STATUS.badRequest);
    }
    const result = await generateConstructVisual(user.id, parsed.data);
    let status: number = HTTP_STATUS.ok;
    if (result.status === "not-found") {
      status = HTTP_STATUS.notFound;
    }
    return Response.json(result, {
      status,
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return appErrorResponse(
      toAppError(error, "generate construct visual").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}
async function getVisualGeneration(request: Request): Promise<Response> {
  try {
    const user = await currentUser();
    if (user === undefined) {
      return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
    }
    const parsed = QUOTE_QUERY.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) {
      return appErrorResponse("invalid-request", HTTP_STATUS.badRequest);
    }
    const quote = await readVisualGeneration(
      user.id,
      parsed.data.constructId,
      parsed.data.requestId,
    );
    if (quote === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    return Response.json(quote, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return appErrorResponse(
      toAppError(error, "read construct visual generation").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}
async function deliverVisualAsset(
  kind: string,
  id: string,
  assetId: string,
): Promise<Response> {
  try {
    const user = await currentUser();
    if (user === undefined) {
      return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
    }
    const destination = VISUAL_DESTINATION.safeParse({ kind, id });
    if (!(destination.success && z.uuid().safeParse(assetId).success)) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    const asset = await getVisualAsset(user.id, destination.data, assetId);
    if (asset === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    return new Response(Buffer.from(asset.data, "base64"), {
      headers: {
        "content-type": asset.mediaType,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return appErrorResponse(
      toAppError(error, "deliver construct visual").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}

export { deliverVisualAsset, getVisualGeneration, postVisualGeneration };
