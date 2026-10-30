import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { chatOwnedBy } from "@/accounts/owner-scope.ts";
import { POST } from "@/app/api/chat/route.ts";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { listMessages } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import {
  imageId,
  MAX_IMAGE_BYTES,
  MAX_MESSAGE_IMAGES,
} from "@/images/image-contract.ts";
import { deliverImage, uploadImage } from "@/images/image-http.ts";
import { getImage, saveImage } from "@/images/store.ts";
import { messageIdFixture } from "../../support/id-fixtures.ts";
import { PNG_BASE64, pngBytes } from "../../support/images/image-fixtures.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";
import { sendChatMessage } from "../test-database/chat-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

function upload(
  chatId: string,
  body: Uint8Array = pngBytes(),
  mediaType = "image/png",
): Promise<Response> {
  return uploadImage(
    new Request(`http://localhost/api/images?chat=${chatId}`, {
      method: "POST",
      headers: { "content-type": mediaType },
      body: Buffer.from(body),
    }),
  );
}
function imageMessage(url: string): {
  type: "file";
  mediaType: "image/png";
  filename: string;
  url: string;
} {
  return { type: "file", mediaType: "image/png", filename: "pixel.png", url };
}
function post(chatId: string, parts: unknown[]): Promise<Response> {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: chatId,
        message: { id: messageIdFixture(), role: "user", parts },
      }),
    }),
  );
}

describe("use_case_chat_images", () => {
  test("image-only messages persist, and follow-ups receive the original image bytes through the fake provider", async () => {
    const { her, herData } = await twoUsers();
    const chat = await herData.chat(await herData.project());
    const url = await saveImage(her.id, chat.id, pngBytes(), "image/png");
    if (url === undefined) {
      throw new Error("Image was not saved");
    }
    const response = await post(chat.id, [imageMessage(url)]);
    expect(response.status).toBe(HTTP_STATUS.ok);
    await response.text();
    await afterTasksDone();
    const saved = await listMessages(her.id, chat.id);
    expect(saved[0]?.parts).toEqual([imageMessage(url)]);
    const followUp = await sendChatMessage(chat.id, "/mock-images");
    expect(followUp.status).toBe(HTTP_STATUS.ok);
    const reply = (await listMessages(her.id, chat.id)).at(-1);
    expect(reply?.parts).toContainEqual(
      expect.objectContaining({
        type: "text",
        text: JSON.stringify([
          { mediaType: "image/png", bytes: [...pngBytes()] },
        ]),
      }),
    );
  });
  test("private delivery and chat deletion apply to uploads, and foreign references cannot be sent", async () => {
    const { her, other } = await twoUsers();
    const chat = await createStandaloneChat(her.id);
    const uploaded = await upload(chat.id);
    expect(uploaded.status).toBe(HTTP_STATUS.ok);
    const { url } = z.object({ url: z.string() }).parse(await uploaded.json());
    const id = imageId(url);
    if (id === undefined) {
      throw new Error("No private image reference");
    }
    const delivered = await deliverImage(id);
    expect(delivered.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await delivered.arrayBuffer()).toString("base64")).toBe(
      PNG_BASE64,
    );
    await signIn(other);
    expect((await deliverImage(id)).status).toBe(HTTP_STATUS.notFound);
    expect(await getImage(other.id, id)).toBeUndefined();
    expect((await upload(chat.id)).status).toBe(HTTP_STATUS.notFound);
    const theirs = await createStandaloneChat(other.id);
    const forged = await post(theirs.id, [imageMessage(url)]);
    expect(forged.status).toBe(HTTP_STATUS.badRequest);
    expect(await listMessages(other.id, theirs.id)).toEqual([]);
    await signIn(her);
    await getDb()
      .delete(chats)
      .where(and(eq(chats.id, chat.id), chatOwnedBy(her.id)));
    expect((await deliverImage(id)).status).toBe(HTTP_STATUS.notFound);
  });
  test("upload and message boundaries reject oversized, unsupported, forged and too many attachments", async () => {
    const { her } = await twoUsers();
    const chat = await createStandaloneChat(her.id);
    const invalid = await Promise.all([
      upload(chat.id, pngBytes(), "image/svg+xml"),
      upload(chat.id, new Uint8Array(MAX_IMAGE_BYTES + 1)),
      upload(chat.id, new TextEncoder().encode("not an image")),
      post(chat.id, [imageMessage("https://example.com/image.png")]),
      post(
        chat.id,
        Array.from({ length: MAX_MESSAGE_IMAGES + 1 }, () =>
          imageMessage("/api/images/00000000-0000-4000-8000-000000000001"),
        ),
      ),
    ]);
    expect(invalid.every((response) => !response.ok)).toBe(true);
    expect(await listMessages(her.id, chat.id)).toEqual([]);
  });
});
