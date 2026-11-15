import { currentUser } from "@/auth/current-user.ts";
import { appErrorResponse } from "@/errors/app-error.ts";
import { toAppError } from "@/errors/to-app-error.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { getImage } from "@/images/store.ts";

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

export { deliverImage };
