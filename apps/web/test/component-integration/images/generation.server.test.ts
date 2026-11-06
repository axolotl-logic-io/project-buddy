import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createStandaloneChat } from "@/chats/standalone-chat.ts";
import { listMessages } from "@/chats/store.ts";
import { DEFAULT_CONSTRUCT_ID, getConstruct } from "@/constructs/index.ts";
import { getDb } from "@/db/client.ts";
import { imageGenerations } from "@/db/tables/image-generations.ts";
import { chats } from "@/db/tables/projects-and-chats.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { generateForChat } from "@/images/generate.ts";
import {
  GALLERY_PAGE_SIZE,
  GENERATE_IMAGE_OUTPUT,
} from "@/images/generation-contract.ts";
import { deliverGeneratedImage } from "@/images/generation-http.ts";
import {
  claimGeneration,
  completeGeneration,
  failGeneration,
  getGeneratedImage,
  listGeneratedImages,
} from "@/images/generation-store.ts";
import { imageId } from "@/images/image-contract.ts";
import {
  type GeneratedImage,
  IMAGE_RESERVATION_MICRO_USD,
  imageProvider,
} from "@/images/image-provider.ts";
import { getImage } from "@/images/store.ts";
import { pngBytes } from "../../support/images/image-fixtures.ts";
import {
  goldSpent,
  spendGold,
} from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { sendChatMessage } from "../test-database/chat-test-kit.ts";
import { signIn, signOut } from "../test-database/session-test-kit.ts";

vi.mock("@/images/image-provider.ts", async (original) => ({
  ...(await original<typeof import("@/images/image-provider.ts")>()),
  imageProvider: vi.fn(),
}));

const PROMPT = "A blue bird in a forest";
const PNG = Buffer.from(pngBytes());
const SPENT_BELOW_IMAGE_RESERVATION = 800_000;
const COST = 8000;
// The starting 100 gold, in micro-USD.
const STARTING_BALANCE = 1_000_000;
const FAKE_IMAGE: GeneratedImage = {
  bytes: PNG,
  mediaType: "image/png",
  costMicroUsd: COST,
};

async function setup(): Promise<{
  user: Awaited<ReturnType<typeof testUser>>;
  chat: Awaited<ReturnType<typeof createStandaloneChat>>;
}> {
  const user = await testUser();
  const chat = await createStandaloneChat(
    user.id,
    getConstruct(DEFAULT_CONSTRUCT_ID),
  );
  return { user, chat };
}

beforeEach(() => {
  vi.mocked(imageProvider).mockReturnValue({
    generate: vi.fn().mockResolvedValue(FAKE_IMAGE),
  });
});

describe("generated images", () => {
  test("use_case_generate_image", async () => {
    const { user, chat } = await setup();
    await signIn(user);
    const response = await sendChatMessage(
      chat.id,
      `/mock-tool generate_image ${JSON.stringify({ prompt: PROMPT })}`,
    );
    expect(response.status).toBe(HTTP_STATUS.ok);
    const saved = await listMessages(user.id, chat.id);
    const results = saved.flatMap((message) =>
      message.parts.flatMap((part) => {
        if (part.type === "tool-generate_image" && "output" in part) {
          return [GENERATE_IMAGE_OUTPUT.parse(part.output)];
        }
        return [];
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("generated");
    const [image] = await listGeneratedImages(user.id);
    expect(image?.prompt).toBe(PROMPT);
    expect(image?.chatId).toBe(chat.id);
    if (image === undefined) {
      throw new Error("Missing generated image");
    }
    const stranger = await testUser();
    await signIn(stranger);
    expect((await deliverGeneratedImage(image.id, true)).status).toBe(
      HTTP_STATUS.notFound,
    );
    expect(await listGeneratedImages(stranger.id)).toEqual([]);
    const storedId = imageId(image.imageUrl ?? "");
    if (storedId === undefined) {
      throw new Error("Missing image reference");
    }
    expect(await getImage(stranger.id, storedId)).toBeUndefined();
    await signIn(user);
    const delivered = await deliverGeneratedImage(image.id, true);
    expect(delivered.status).toBe(HTTP_STATUS.ok);
    expect(delivered.headers.get("content-disposition")).toContain(
      "attachment;",
    );
    expect(delivered.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await delivered.arrayBuffer())).toEqual(PNG);
    expect((await getGeneratedImage(user.id, image.id))?.status).toBe(
      "generated",
    );
  });

  test("reserves gold atomically and prevents replay from spending twice", async () => {
    const { user, chat } = await setup();
    // Leaves gold for exactly one reservation.
    await spendGold(user, STARTING_BALANCE - IMAGE_RESERVATION_MICRO_USD);
    const request = {
      owner: user.id,
      chatId: chat.id,
      requestId: crypto.randomUUID(),
      prompt: PROMPT,
    };
    const claims = await Promise.all([
      claimGeneration(request),
      claimGeneration({ ...request, requestId: crypto.randomUUID() }),
    ]);
    expect(claims.map((claim) => claim.status).sort()).toEqual([
      "claimed",
      "outOfGold",
    ]);
    expect(await goldSpent(user)).toBe(STARTING_BALANCE);
    const [row] = await listGeneratedImages(user.id);
    if (row === undefined) {
      throw new Error("Missing reservation");
    }
    expect(await completeGeneration(user.id, row.id, FAKE_IMAGE)).toBe(true);
    expect(await completeGeneration(user.id, row.id, FAKE_IMAGE)).toBe(false);
    expect(await goldSpent(user)).toBe(
      STARTING_BALANCE - IMAGE_RESERVATION_MICRO_USD + COST,
    );
  });

  test("keeps failed and interrupted reservations, and isolates all reads and writes", async () => {
    const [{ user, chat }, stranger] = await Promise.all([setup(), testUser()]);
    const request = {
      owner: user.id,
      chatId: chat.id,
      requestId: crypto.randomUUID(),
      prompt: PROMPT,
    };
    const claim = await claimGeneration(request);
    if (claim.status !== "claimed") {
      throw new Error("Missing claim");
    }
    expect(await claimGeneration(request)).toEqual({ status: "pending" });
    expect(await completeGeneration(stranger.id, claim.id, FAKE_IMAGE)).toBe(
      false,
    );
    await failGeneration(stranger.id, claim.id);
    expect(await getGeneratedImage(stranger.id, claim.id)).toBeUndefined();
    expect(await getGeneratedImage(user.id, "invalid")).toBeUndefined();
    expect(await listGeneratedImages(stranger.id)).toEqual([]);
    expect(
      await claimGeneration({
        ...request,
        owner: stranger.id,
        requestId: crypto.randomUUID(),
      }),
    ).toEqual({ status: "failed" });
    await signIn(stranger);
    expect((await deliverGeneratedImage(claim.id, false)).status).toBe(
      HTTP_STATUS.notFound,
    );
    signOut();
    expect((await deliverGeneratedImage(claim.id, true)).status).toBe(
      HTTP_STATUS.unauthorized,
    );
    await failGeneration(user.id, claim.id);
    expect(await claimGeneration(request)).toEqual({ status: "failed" });
    expect(await goldSpent(user)).toBe(IMAGE_RESERVATION_MICRO_USD);
  });

  test("deleting the source chat deletes metadata and bytes but never refunds spending", async () => {
    const { user, chat } = await setup();
    const result = await generateForChat(
      {
        owner: user.id,
        chatId: chat.id,
        requestId: crypto.randomUUID(),
        prompt: PROMPT,
      },
      {
        provider: imageProvider(),
        claim: claimGeneration,
        complete: completeGeneration,
        fail: failGeneration,
      },
    );
    if (result.status !== "generated") {
      throw new Error("Image was not generated");
    }
    const saved = await getGeneratedImage(user.id, result.id);
    const storedId = imageId(saved?.imageUrl ?? "");
    if (storedId === undefined) {
      throw new Error("Missing saved image");
    }
    await getDb().delete(chats).where(eq(chats.id, chat.id));
    expect(await getImage(user.id, storedId)).toBeUndefined();
    expect(await listGeneratedImages(user.id)).toEqual([]);
    expect(await getGeneratedImage(user.id, result.id)).toBeUndefined();
    await signIn(user);
    expect((await deliverGeneratedImage(result.id, false)).status).toBe(
      HTTP_STATUS.notFound,
    );
    expect(await goldSpent(user)).toBe(COST);
  });
  test("pages through entries with identical timestamps without omitting images", async () => {
    const { user, chat } = await setup();
    const rows = Array.from({ length: GALLERY_PAGE_SIZE + 1 }, () => ({
      userId: user.id,
      chatId: chat.id,
      requestId: crypto.randomUUID(),
      prompt: PROMPT,
      costMicroUsd: 0,
      createdAt: new Date("2026-10-30T12:34:56.789Z"),
    }));
    await getDb().insert(imageGenerations).values(rows);
    const first = await listGeneratedImages(user.id);
    expect(first).toHaveLength(GALLERY_PAGE_SIZE);
    const last = first.at(-1);
    if (last === undefined) {
      throw new Error("Missing gallery page");
    }
    const next = await listGeneratedImages(user.id, last);
    expect(next).toHaveLength(1);
    expect(new Set([...first, ...next].map((image) => image.id)).size).toBe(
      rows.length,
    );
  });
});

test("an image reservation refusal reports the acting user's 20 gold against the 25 required without spending or calling the provider", async () => {
  const { user, chat } = await setup();
  await spendGold(user, SPENT_BELOW_IMAGE_RESERVATION);
  const generate = vi.fn().mockResolvedValue(FAKE_IMAGE);
  const result = await generateForChat(
    {
      owner: user.id,
      chatId: chat.id,
      requestId: crypto.randomUUID(),
      prompt: PROMPT,
    },
    {
      provider: { generate },
      claim: claimGeneration,
      complete: completeGeneration,
      fail: failGeneration,
    },
  );
  expect(result).toEqual({
    status: "outOfGold",
    requiredGold: 25,
    availableGold: 20,
  });
  expect(generate).not.toHaveBeenCalled();
  expect(await goldSpent(user)).toBe(SPENT_BELOW_IMAGE_RESERVATION);
  expect(await listGeneratedImages(user.id)).toEqual([]);
});
