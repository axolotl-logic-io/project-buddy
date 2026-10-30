import { describe, expect, test, vi } from "vitest";
import { CHAT_ID, USER_ID } from "@/ids.ts";
import { type GenerationServices, generateForChat } from "@/images/generate.ts";
import { GENERATION_ID } from "@/images/generation-contract.ts";

const ID = GENERATION_ID.parse("b5c269b1-b33b-417a-b71d-7d2d64994c71");
const REQUEST = {
  owner: USER_ID.parse("fbe7dbe1-8b08-4cbb-ab35-90d8c047766c"),
  chatId: CHAT_ID.parse("935d861c-e0f0-48ed-8190-98d5ea823a88"),
  requestId: "test-image-call",
  prompt: "A blue bird",
};
const IMAGE = {
  bytes: new Uint8Array([1, 2]),
  mediaType: "image/png",
  costMicroUsd: 4000,
};

function services(): GenerationServices & {
  readonly provider: NonNullable<GenerationServices["provider"]>;
} {
  return {
    provider: { generate: vi.fn().mockResolvedValue(IMAGE) },
    claim: vi.fn().mockResolvedValue({ status: "claimed", id: ID }),
    complete: vi.fn().mockResolvedValue(true),
    fail: vi.fn().mockResolvedValue(undefined),
  };
}

describe("image generation", () => {
  test("saves the result before reporting success", async () => {
    const kit = services();
    expect(await generateForChat(REQUEST, kit)).toEqual({
      status: "generated",
      id: ID,
      prompt: REQUEST.prompt,
    });
    expect(kit.complete).toHaveBeenCalledWith(REQUEST.owner, ID, IMAGE);
  });

  test("makes no call and claims no quota without credentials", async () => {
    const kit = services();
    expect(
      await generateForChat(REQUEST, { ...kit, provider: undefined }),
    ).toEqual({ status: "unavailable" });
    expect(kit.claim).not.toHaveBeenCalled();
  });

  test.each(["quotaUsedUp", "pending", "failed"] as const)(
    "does not call a paid provider for a %s claim",
    async (status) => {
      const kit = services();
      vi.mocked(kit.claim).mockResolvedValue({ status });
      expect(await generateForChat(REQUEST, kit)).toEqual({ status });
      expect(kit.provider.generate).not.toHaveBeenCalled();
    },
  );

  test("reuses an already generated result without paying again", async () => {
    const kit = services();
    const result = {
      status: "generated",
      id: ID,
      prompt: REQUEST.prompt,
    } as const;
    vi.mocked(kit.claim).mockResolvedValue(result);
    expect(await generateForChat(REQUEST, kit)).toEqual(result);
    expect(kit.provider.generate).not.toHaveBeenCalled();
  });

  test("reports provider failure and preserves the claim rather than retrying", async () => {
    const kit = services();
    vi.mocked(kit.provider.generate).mockRejectedValue(
      new Error("fake provider failure"),
    );
    expect(await generateForChat(REQUEST, kit)).toEqual({ status: "failed" });
    expect(kit.fail).toHaveBeenCalledWith(REQUEST.owner, ID);
    expect(kit.complete).not.toHaveBeenCalled();
  });

  test("does not report an image saved when storage fails", async () => {
    const kit = services();
    vi.mocked(kit.complete).mockRejectedValue(
      new Error("fake storage failure"),
    );
    expect(await generateForChat(REQUEST, kit)).toEqual({ status: "failed" });
    expect(kit.fail).toHaveBeenCalledWith(REQUEST.owner, ID);
  });

  test("reports failure if the chat was deleted while generating", async () => {
    const kit = services();
    vi.mocked(kit.complete).mockResolvedValue(false);
    expect(await generateForChat(REQUEST, kit)).toEqual({ status: "failed" });
  });
});
