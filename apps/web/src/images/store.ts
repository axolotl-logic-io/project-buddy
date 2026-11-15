// Private storage and model hydration share this boundary. Callers never
// fetch an image URL from the network, including URLs supplied by a client.

import type { UIMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { imageOpenTo } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { images } from "@/db/tables/images.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ChatId, parseImageId, type UserId } from "@/ids.ts";
import { IMAGE_MEDIA_TYPE, imageId } from "@/images/image-contract.ts";

interface ImageContent {
  readonly mediaType: string;
  readonly data: string;
}

async function getImage(
  owner: UserId,
  id: string,
  chatId?: ChatId,
): Promise<ImageContent | undefined> {
  if (parseImageId(id) === undefined) {
    return undefined;
  }
  const predicates = [eq(images.id, id), imageOpenTo(owner)];
  if (chatId !== undefined) {
    predicates.push(eq(images.chatId, chatId));
  }
  const [image] = await withAppErrors("get image", () =>
    getDb()
      .select({ mediaType: images.mediaType, data: images.data })
      .from(images)
      .where(and(...predicates)),
  );
  return image;
}

// Supplies the bytes of every image saved in the history on each reply. A
// reference to an image that is gone or not the chat's is invalid.
async function hydrateImages(
  owner: UserId,
  chatId: ChatId,
  history: UIMessage[],
): Promise<UIMessage[]> {
  return await Promise.all(
    history.map(
      async (message): Promise<UIMessage> => ({
        ...message,
        parts: await Promise.all(
          message.parts.map(
            async (part): Promise<UIMessage["parts"][number]> => {
              if (part.type !== "file") {
                return part;
              }
              const id = imageId(part.url);
              if (id === undefined) {
                throw new AppError("invalid-image", undefined);
              }
              const image = await getImage(owner, id, chatId);
              if (
                image === undefined ||
                !IMAGE_MEDIA_TYPE.safeParse(image.mediaType).success ||
                image.mediaType !== part.mediaType
              ) {
                throw new AppError("invalid-image", undefined);
              }
              return {
                ...part,
                url: `data:${image.mediaType};base64,${image.data}`,
              };
            },
          ),
        ),
      }),
    ),
  );
}

export { getImage, hydrateImages };
