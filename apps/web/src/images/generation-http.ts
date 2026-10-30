import { currentUser } from "@/auth/current-user.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { getGeneratedImage } from "@/images/generation-store.ts";
import { imageId } from "@/images/image-contract.ts";
import { getImage } from "@/images/store.ts";

async function deliverGeneratedImage(
  id: string,
  download: boolean,
): Promise<Response> {
  try {
    const user = await currentUser();
    if (user === undefined) {
      return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
    }
    const generation = await getGeneratedImage(user.id, id);
    const storedId = imageId(generation?.imageUrl ?? "");
    if (generation === undefined || storedId === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    const image = await getImage(user.id, storedId, generation.chatId);
    if (image === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    const headers: Record<string, string> = {
      "content-type": image.mediaType,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    };
    const extension = image.mediaType.split("/").at(-1) ?? "png";
    if (download) {
      headers["content-disposition"] =
        `attachment; filename="generated-${generation.id}.${extension}"`;
    }
    return new Response(Buffer.from(image.data, "base64"), { headers });
  } catch (error) {
    return appErrorResponse(
      toAppError(error, "deliver generated image").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}

export { deliverGeneratedImage };
