const IMAGE_RESERVATION_MICRO_USD = 250_000;

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

// Remote image generation is disabled by policy. Existing images remain usable.
const imageProvider: () => ImageProvider | undefined = (): undefined =>
  undefined;

export type { GeneratedImage, ImageProvider };
export { IMAGE_RESERVATION_MICRO_USD, imageProvider };
