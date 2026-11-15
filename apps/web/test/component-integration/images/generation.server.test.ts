// Images generated before image generation was turned off: the site still
// serves each to its owner, and deletes it with its chat.
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { getDb } from "@/db/client.ts";
import { chats } from "@/db/tables/quests-and-chats.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { deliverGeneratedImage } from "@/images/generation-http.ts";
import { getGeneratedImage } from "@/images/generation-store.ts";
import { imageId } from "@/images/image-contract.ts";
import { getImage } from "@/images/store.ts";
import { seedGeneratedImage } from "../../support/test-database/artwork-test-kit.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn, signOut } from "../test-database/session-test-kit.ts";

describe("generated images", () => {
  test("only their owner can read or download them", async () => {
    const [user, stranger] = await Promise.all([testUser(), testUser()]);
    const data = testData(user);
    const chat = await data.chat(await data.quest());
    const id = await seedGeneratedImage(user.id, chat.id);

    expect(await getGeneratedImage(stranger.id, id)).toBeUndefined();
    expect(await getGeneratedImage(user.id, "invalid")).toBeUndefined();
    await signIn(user);
    const shown = await deliverGeneratedImage(id, false);
    expect(shown.status).toBe(HTTP_STATUS.ok);
    expect(shown.headers.get("content-type")).toBe("image/png");
    expect(shown.headers.get("cache-control")).toBe("private, no-store");
    expect(shown.headers.get("content-disposition")).toBeNull();
    const downloaded = await deliverGeneratedImage(id, true);
    expect(downloaded.headers.get("content-disposition")).toBe(
      `attachment; filename="generated-${id}.png"`,
    );
    await signIn(stranger);
    expect((await deliverGeneratedImage(id, false)).status).toBe(
      HTTP_STATUS.notFound,
    );
    signOut();
    expect((await deliverGeneratedImage(id, true)).status).toBe(
      HTTP_STATUS.unauthorized,
    );
  });

  test("deleting the source chat deletes their metadata and bytes", async () => {
    const user = await testUser();
    const data = testData(user);
    const chat = await data.chat(await data.quest());
    const id = await seedGeneratedImage(user.id, chat.id);
    const saved = await getGeneratedImage(user.id, id);
    const storedId = imageId(saved?.imageUrl ?? "");
    if (storedId === undefined) {
      throw new Error("Missing saved image");
    }

    await getDb().delete(chats).where(eq(chats.id, chat.id));

    expect(await getImage(user.id, storedId)).toBeUndefined();
    expect(await getGeneratedImage(user.id, id)).toBeUndefined();
    await signIn(user);
    expect((await deliverGeneratedImage(id, false)).status).toBe(
      HTTP_STATUS.notFound,
    );
  });
});
