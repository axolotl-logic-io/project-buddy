import { getDb } from "@/db/client.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { images } from "@/db/tables/images.ts";
import type { ChatId, UserId } from "@/ids.ts";
import {
  GENERATION_ID,
  type GenerationId,
} from "@/images/generation-contract.ts";
import { PNG_BASE64 } from "../images/image-fixtures.ts";

// Images the site no longer makes but still serves to their owners: uploads
// and generated images.

// An image in a chat, as an upload saved it before uploads were removed:
// a one-pixel PNG. Returns its id.
async function seedImage(chatId: ChatId): Promise<string> {
  const [image] = await getDb()
    .insert(images)
    .values({ chatId, mediaType: "image/png", data: PNG_BASE64 })
    .returning({ id: images.id });
  if (image === undefined) {
    throw new Error("The image was not saved");
  }
  return image.id;
}

// A generated image in one of owner's chats, as image generation stored it
// before it was turned off: the image's bytes and the generation that names
// them.
async function seedGeneratedImage(
  owner: UserId,
  chatId: ChatId,
): Promise<GenerationId> {
  const url = `/api/images/${await seedImage(chatId)}`;
  const [generation] = await getDb()
    .insert(imageGenerations)
    .values({
      userId: owner,
      chatId,
      requestId: crypto.randomUUID(),
      prompt: "A sea turtle",
      imageUrl: url,
      status: "generated",
      costMicroUsd: 0,
    })
    .returning({ id: imageGenerations.id });
  return GENERATION_ID.parse(generation?.id);
}

export { seedGeneratedImage, seedImage };
