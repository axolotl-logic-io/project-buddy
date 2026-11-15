// Images saved in a conversation before uploads were removed: the site
// serves each to its owner alone, deletes it with its chat, and a new
// message holds text only.
import { and, eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { chatOpenTo } from "@/accounts/owner-scope.ts";
import { POST } from "@/app/api/chat/route.ts";
import { listMessages } from "@/chats/store.ts";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { deliverImage } from "@/images/image-http.ts";
import { getImage } from "@/images/store.ts";
import { messageIdFixture } from "../../support/id-fixtures.ts";
import { PNG_BASE64 } from "../../support/images/image-fixtures.ts";
import { seedImage } from "../../support/test-database/artwork-test-kit.ts";
import { afterTasksDone } from "../test-database/after-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

function imagePart(id: string): {
  type: "file";
  mediaType: "image/png";
  filename: string;
  url: string;
} {
  return {
    type: "file",
    mediaType: "image/png",
    filename: "pixel.png",
    url: `/api/images/${id}`,
  };
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

describe("saved conversation image access", () => {
  test("a saved image is delivered only to its owner and goes with its chat", async () => {
    const { her, herData, other } = await twoUsers();
    const chat = await herData.chat(await herData.quest());
    const id = await seedImage(chat.id);

    await signIn(her);
    const delivered = await deliverImage(id);
    expect(delivered.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await delivered.arrayBuffer()).toString("base64")).toBe(
      PNG_BASE64,
    );
    await signIn(other);
    expect((await deliverImage(id)).status).toBe(HTTP_STATUS.notFound);
    expect(await getImage(other.id, id)).toBeUndefined();

    await getDb()
      .delete(chats)
      .where(and(eq(chats.id, chat.id), chatOpenTo(her.id)));
    await signIn(her);
    expect((await deliverImage(id)).status).toBe(HTTP_STATUS.notFound);
  });

  test("a new message holds text only", async () => {
    const { her, herData } = await twoUsers();
    const chat = await herData.chat(await herData.quest());
    const id = await seedImage(chat.id);
    await signIn(her);

    const withImage = await post(chat.id, [imagePart(id)]);

    expect(withImage.status).toBe(HTTP_STATUS.badRequest);
    expect(await listMessages(her.id, chat.id)).toEqual([]);
    const text = await post(chat.id, [{ type: "text", text: "Hello" }]);
    expect(text.status).toBe(HTTP_STATUS.ok);
    await text.text();
    await afterTasksDone();
  });
});
