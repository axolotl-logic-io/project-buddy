import { createOpenAI } from "@ai-sdk/openai";
import { generateImage, type ImageModel } from "ai";
import { z } from "zod";
import { readConstructModel, readOpenAiImageKey } from "@/env.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";

// One low-quality 1024px square, optionally conditioned on reference bytes.
// Missing usage or reference-token details retains the $0.25 reservation.
const IMAGE_RESERVATION_MICRO_USD = 250_000;
const IMAGE_TIMEOUT_MS = 120_000;
const TEXT_MICRO_USD_PER_TOKEN = 2.5;
const IMAGE_INPUT_MICRO_USD_PER_TOKEN = 4;
const OUTPUT_MICRO_USD_PER_TOKEN = 15;
const INPUT_DETAILS = z.object({
  openai: z.object({
    images: z
      .array(
        z.object({
          textTokens: z.number().int().nonnegative(),
          imageTokens: z.number().int().nonnegative(),
        }),
      )
      .length(1),
  }),
});

interface GeneratedImage {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  readonly costMicroUsd: number;
}
interface ImageProvider {
  readonly generate: (
    prompt: string,
    reference?: Uint8Array,
  ) => Promise<GeneratedImage>;
}

// Undefined when credentials are absent. No call, and no reservation, is
// made in that case. The chat model has its own independent provider.
function imageProvider(): ImageProvider | undefined {
  if (readConstructModel() === "mock") {
    return undefined;
  }
  const apiKey = readOpenAiImageKey();
  if (apiKey === undefined) {
    return undefined;
  }
  const openai = createOpenAI({ apiKey });
  return meteredImageProvider(openai.image("gpt-image-2"));
}

function meteredImageProvider(model: ImageModel): ImageProvider {
  return {
    async generate(
      prompt: string,
      reference?: Uint8Array,
    ): Promise<GeneratedImage> {
      let imagePrompt: Parameters<typeof generateImage>[0]["prompt"] = prompt;
      if (reference !== undefined) {
        imagePrompt = { text: prompt, images: [reference] };
      }
      const result = await withAppErrors("generate image", () =>
        generateImage({
          model,
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
          providerOptions: {
            openai: {
              quality: "low",
              outputFormat: "webp",
              outputCompression: 80,
            },
          },
        }),
      );
      let costMicroUsd = IMAGE_RESERVATION_MICRO_USD;
      const { inputTokens, outputTokens } = result.usage;
      if (inputTokens !== undefined && outputTokens !== undefined) {
        let textTokens = inputTokens;
        let imageTokens = 0;
        let known = reference === undefined;
        const details = INPUT_DETAILS.safeParse(result.providerMetadata);
        if (details.success) {
          const [input] = details.data.openai.images;
          if (
            input !== undefined &&
            input.textTokens + input.imageTokens === inputTokens
          ) {
            ({ textTokens, imageTokens } = input);
            known = true;
          }
        }
        if (known) {
          costMicroUsd = Math.ceil(
            textTokens * TEXT_MICRO_USD_PER_TOKEN +
              imageTokens * IMAGE_INPUT_MICRO_USD_PER_TOKEN +
              outputTokens * OUTPUT_MICRO_USD_PER_TOKEN,
          );
        }
      }
      return {
        bytes: result.image.uint8Array,
        mediaType: result.image.mediaType,
        costMicroUsd,
      };
    },
  };
}

export type { GeneratedImage, ImageProvider };
export { IMAGE_RESERVATION_MICRO_USD, imageProvider, meteredImageProvider };
