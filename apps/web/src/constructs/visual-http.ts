import sharp from "sharp";
import { z } from "zod";
import { currentUser } from "@/auth/current-user.ts";
import { VISUAL_DESTINATION } from "@/constructs/visual.ts";
import { getVisualAsset } from "@/constructs/visual-asset-store.ts";
import { VISUAL_WIDTH } from "@/constructs/visual-delivery.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";

async function deliverVisualAsset(
  kind: string,
  id: string,
  assetId: string,
  width?: string | null,
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
    let targetWidth: number | undefined;
    if (width !== undefined && width !== null) {
      const parsed = VISUAL_WIDTH.safeParse(Number(width));
      if (!parsed.success) {
        return appErrorResponse("invalid-request", HTTP_STATUS.badRequest);
      }
      targetWidth = parsed.data;
    }
    const asset = await getVisualAsset(user.id, destination.data, assetId);
    if (asset === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    let bytes = Buffer.from(asset.data, "base64");
    let { mediaType } = asset;
    if (targetWidth !== undefined) {
      bytes = await sharp(bytes)
        .resize(targetWidth, targetWidth, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      mediaType = "image/webp";
    }
    return new Response(bytes, {
      headers: {
        "content-type": mediaType,
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

export { deliverVisualAsset };
