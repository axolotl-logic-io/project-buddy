import { createOpenAI } from "@ai-sdk/openai";
import { generateImage, type ImageModel } from "ai";
import { readBuddyModel, readOpenAiImageKey } from "@/env.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";

// Reserves $0.25 before a call. Settings are fixed: text only, 1000
// characters, one low-quality 1024px square. Unknown billing retains this
// conservative reservation; successful usage replaces it with actual cost.
const IMAGE_RESERVATION_MICRO_USD = 250_000;
const IMAGE_TIMEOUT_MS = 120_000;
const TEXT_MICRO_USD_PER_TOKEN = 2.5;
const OUTPUT_MICRO_USD_PER_TOKEN = 15;

interface GeneratedImage {
  readonly bytes: Uint8Array;
  readonly mediaType: string;
  readonly costMicroUsd: number;
}
interface ImageProvider {
  readonly generate: (prompt: string) => Promise<GeneratedImage>;
}

// Undefined when credentials are absent. No call, and no reservation, is
// made in that case. The chat model has its own independent provider.
function imageProvider(): ImageProvider | undefined {
  if (readBuddyModel() === "mock") {
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
    async generate(prompt: string): Promise<GeneratedImage> {
      const result = await withAppErrors("generate image", () =>
        generateImage({
          model,
          prompt,
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
        costMicroUsd = Math.ceil(
          inputTokens * TEXT_MICRO_USD_PER_TOKEN +
            outputTokens * OUTPUT_MICRO_USD_PER_TOKEN,
        );
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
