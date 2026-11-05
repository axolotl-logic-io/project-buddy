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
const IMAGE_INPUT_TOKENS = 1000;
const EXPECTED_REFERENCE_COST = 10_250;
type ProviderResult = Awaited<ReturnType<ImageModelV4["doGenerate"]>>;

function fakeImageResult(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  providerMetadata?: ProviderResult["providerMetadata"],
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
    providerMetadata: providerMetadata ?? {},
  };
}

function fakeModel(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  providerMetadata?: ProviderResult["providerMetadata"],
): ImageModelV4 {
  return {
    specificationVersion: "v4",
    provider: "fake",
    modelId: "fake-image-model",
    maxImagesPerCall: 1,
    doGenerate: vi.fn(
      (): Promise<Awaited<ReturnType<ImageModelV4["doGenerate"]>>> =>
        Promise.resolve(
          fakeImageResult(inputTokens, outputTokens, providerMetadata),
        ),
    ),
  };
}

describe("image provider accounting", () => {
  test("charges reference image input at its image rate", async () => {
    const model = fakeModel(INPUT_TOKENS + IMAGE_INPUT_TOKENS, OUTPUT_TOKENS, {
      openai: {
        images: [{ textTokens: INPUT_TOKENS, imageTokens: IMAGE_INPUT_TOKENS }],
      },
    });
    const image = await meteredImageProvider(model).generate(
      "A bird",
      pngBytes(),
    );
    expect(image.costMicroUsd).toBe(EXPECTED_REFERENCE_COST);
  });

  test("retains the reservation when reference usage lacks its input breakdown", async () => {
    const model = fakeModel(INPUT_TOKENS + IMAGE_INPUT_TOKENS, OUTPUT_TOKENS);
    const image = await meteredImageProvider(model).generate(
      "A bird",
      pngBytes(),
    );
    expect(image.costMicroUsd).toBe(IMAGE_RESERVATION_MICRO_USD);
  });

  test("retains the reservation when reference input details disagree with usage", async () => {
    const model = fakeModel(INPUT_TOKENS + IMAGE_INPUT_TOKENS, OUTPUT_TOKENS, {
      openai: { images: [{ textTokens: INPUT_TOKENS, imageTokens: 0 }] },
    });
    const image = await meteredImageProvider(model).generate(
      "A bird",
      pngBytes(),
    );
    expect(image.costMicroUsd).toBe(IMAGE_RESERVATION_MICRO_USD);
  });
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
  test("conditions a single canonical call with supplied raster bytes", async () => {
    const model = fakeModel(INPUT_TOKENS, OUTPUT_TOKENS);
    await meteredImageProvider(model).generate(
      "Preserve the construct",
      pngBytes(),
    );
    expect(model.doGenerate).toHaveBeenCalledTimes(1);
    expect(model.doGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Preserve the construct",
        files: [
          expect.objectContaining({
            type: "file",
            data: pngBytes(),
            mediaType: "image/png",
          }),
        ],
      }),
    );
  });
});
