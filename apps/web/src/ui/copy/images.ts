const IMAGE_COPY = {
  add: "Attach images",
  preview: "Image attachment",
  remove: "Remove image",
  uploading: "Uploading image…",
  limits: "Up to 4 images · JPEG, PNG, GIF or WebP · 2 MiB each",
  tooMany: (limit: number): string =>
    `A message can have at most ${limit} images. Remove an image before adding another.`,
  tooLarge: (name: string, size: number, limit: number): string =>
    `${name} is ${size.toFixed(1)} MiB; the limit is ${limit} MiB per image. Remove it and choose a smaller image.`,
  unsupportedType: (name: string): string =>
    `${name} is not a supported image type. Choose JPEG, PNG, GIF or WebP.`,
  invalidContents:
    "The image data could not be accepted. Remove it and choose another image. Your message is still here.",
  uploadFailed:
    "The image could not be uploaded. Remove it and try again. Your message is still here.",
  retry: "Retry reply",
};

export { IMAGE_COPY };
