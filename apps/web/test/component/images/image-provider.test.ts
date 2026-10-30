import type { ImageModelV4 } from "@ai-sdk/provider";
import { describe, expect, test, vi } from "vitest";
import {
  IMAGE_RESERVATION_MICRO_USD,
  meteredImageProvider,
} from "@/images/image-provider.ts";
import { pngBytes } from "../../support/images/image-fixtures.ts";

const INPUT_TOKENS = 100;
const OUTPUT_TOKENS = 400;
const EXPECTED_COST = 6250;

function fakeImageResult(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): Awaited<ReturnType<ImageModelV4["doGenerate"]>> {
  return {
    images: [pngBytes()],
    warnings: [],
    response: {
      timestamp: new Date(0),
      modelId: "fake-image-model",
      headers: {},
    },
    usage: { inputTokens, outputTokens, totalTokens: undefined },
  };
}

function fakeModel(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): ImageModelV4 {
  return {
    specificationVersion: "v4",
    provider: "fake",
    modelId: "fake-image-model",
    maxImagesPerCall: 1,
    doGenerate: vi.fn(
      (): Promise<Awaited<ReturnType<ImageModelV4["doGenerate"]>>> =>
        Promise.resolve(fakeImageResult(inputTokens, outputTokens)),
    ),
  };
}

describe("image provider accounting", () => {
  test("charges text input and image output and preserves returned bytes", async () => {
    const model = fakeModel(INPUT_TOKENS, OUTPUT_TOKENS);
    const provider = meteredImageProvider(model);
    const image = await provider.generate("A bird");
    expect(image.costMicroUsd).toBe(EXPECTED_COST);
    expect(image.bytes).toEqual(pngBytes());
    expect(image.mediaType).toBe("image/png");
    expect(model.doGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        n: 1,
        size: "1024x1024",
        providerOptions: {
          openai: {
            quality: "low",
            outputFormat: "webp",
            outputCompression: 80,
          },
        },
      }),
    );
  });

  test("retains the reservation when the provider omits usage", async () => {
    const provider = meteredImageProvider(fakeModel(undefined, undefined));
    expect((await provider.generate("A bird")).costMicroUsd).toBe(
      IMAGE_RESERVATION_MICRO_USD,
    );
  });
});
