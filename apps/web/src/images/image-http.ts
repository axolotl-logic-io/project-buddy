import { currentUser } from "@/auth/current-user.ts";
import { AppError, appErrorResponse } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { parseChatId } from "@/ids.ts";
import { IMAGE_MEDIA_TYPE, MAX_IMAGE_BYTES } from "@/images/image-contract.ts";
import { getImage, saveImage } from "@/images/store.ts";

// One binary image per request keeps uploads below the hosting body limit.
async function uploadImage(request: Request): Promise<Response> {
  try {
    const user = await currentUser();
    if (user === undefined) {
      return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
    }
    const chatId = parseChatId(
      new URL(request.url).searchParams.get("chat") ?? "",
    );
    const mediaType = IMAGE_MEDIA_TYPE.safeParse(
      request.headers.get("content-type"),
    );
    if (chatId === undefined || !mediaType.success) {
      return appErrorResponse("invalid-image", HTTP_STATUS.badRequest);
    }
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (request.body === null) {
      return appErrorResponse("invalid-image", HTTP_STATUS.badRequest);
    }
    await request.body.pipeTo(
      new WritableStream<Uint8Array>({
        write(chunk: Uint8Array): void {
          size += chunk.byteLength;
          if (size > MAX_IMAGE_BYTES) {
            throw new AppError("invalid-image", undefined);
          }
          chunks.push(chunk);
        },
      }),
    );
    const url = await saveImage(
      user.id,
      chatId,
      Buffer.concat(chunks),
      mediaType.data,
    );
    if (url === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    return Response.json({ url });
  } catch (error) {
    if (error instanceof AppError && error.errorCase === "invalid-image") {
      return appErrorResponse("invalid-image", HTTP_STATUS.badRequest);
    }
    return appErrorResponse(
      toAppError(error, "upload image").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}
async function deliverImage(id: string): Promise<Response> {
  try {
    const user = await currentUser();
    if (user === undefined) {
      return appErrorResponse("signed-out", HTTP_STATUS.unauthorized);
    }
    const image = await getImage(user.id, id);
    if (image === undefined) {
      return appErrorResponse("not-found", HTTP_STATUS.notFound);
    }
    return new Response(Buffer.from(image.data, "base64"), {
      headers: {
        "content-type": image.mediaType,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return appErrorResponse(
      toAppError(error, "deliver image").errorCase,
      HTTP_STATUS.internalServerError,
    );
  }
}

export { deliverImage, uploadImage };
