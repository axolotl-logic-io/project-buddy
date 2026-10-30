// Private storage and model hydration share this boundary. Callers never
// fetch an image URL from the network, including URLs supplied by a client.
import type { UIMessage } from "ai";
import { and, eq, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { chatOwnedBy, imageOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { images } from "@/db/tables/images.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { AppError } from "@/errors/app-error.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { type ChatId, parseChatId, type UserId } from "@/ids.ts";
import {
  IMAGE_MEDIA_TYPE,
  imageId,
  imageUrl,
  MAX_IMAGE_BYTES,
} from "@/images/image-contract.ts";

interface ImageContent {
  readonly mediaType: string;
  readonly data: string;
}

// Checks the signature as well as the declared format. SVG and arbitrary
// executable content never become an image response.
const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const JPEG_SIGNATURE = Buffer.from("ffd8ff", "hex");
const GIF_SIGNATURES = [Buffer.from("GIF87a"), Buffer.from("GIF89a")];
const WEBP_CONTAINER = Buffer.from("RIFF");
const WEBP_FORMAT = Buffer.from("WEBP");
const WEBP_FORMAT_OFFSET = 8;
function startsWith(bytes: Uint8Array, signature: Buffer, offset = 0): boolean {
  return Buffer.from(bytes.subarray(offset, offset + signature.length)).equals(
    signature,
  );
}
function validImage(bytes: Uint8Array, mediaType: string): boolean {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    return false;
  }
  switch (mediaType) {
    case "image/png":
      return startsWith(bytes, PNG_SIGNATURE);
    case "image/jpeg":
      return startsWith(bytes, JPEG_SIGNATURE);
    case "image/gif":
      return GIF_SIGNATURES.some((signature) => startsWith(bytes, signature));
    case "image/webp":
      return (
        startsWith(bytes, WEBP_CONTAINER) &&
        startsWith(bytes, WEBP_FORMAT, WEBP_FORMAT_OFFSET)
      );
    default:
      return false;
  }
}

async function saveImage(
  owner: UserId,
  chatId: ChatId,
  bytes: Uint8Array,
  mediaType: string,
): Promise<string | undefined> {
  if (!validImage(bytes, mediaType)) {
    throw new AppError("invalid-image", undefined);
  }
  const [saved] = await withAppErrors("save image", () =>
    getDb()
      .insert(images)
      .select(
        new QueryBuilder()
          .select({
            id: sql`gen_random_uuid()`.as("id"),
            chatId: chats.id,
            mediaType: sql`${mediaType}::text`.as("media_type"),
            data: sql`${Buffer.from(bytes).toString("base64")}::text`.as(
              "data",
            ),
            createdAt: sql`now()`.as("created_at"),
          })
          .from(chats)
          .where(and(eq(chats.id, chatId), chatOwnedBy(owner))),
      )
      .returning({ id: images.id }),
  );
  if (saved === undefined) {
    return undefined;
  }
  return imageUrl(saved.id);
}

async function getImage(
  owner: UserId,
  id: string,
  chatId?: ChatId,
): Promise<ImageContent | undefined> {
  if (parseChatId(id) === undefined) {
    return undefined;
  }
  const predicates = [eq(images.id, id), imageOwnedBy(owner)];
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

// Validates message references before saving, and supplies bytes for all
// history images on every reply, so follow-up questions retain vision.
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

export { getImage, hydrateImages, saveImage, validImage };
