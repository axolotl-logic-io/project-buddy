const IMAGE_COPY = {
  add: "Attach images",
  preview: "Image attachment",
  remove: "Remove image",
  uploading: "Uploading image…",
  limits: "Up to 4 images · JPEG, PNG, GIF or WebP · 2 MiB each",
  uploadFailed:
    "The image could not be uploaded. Remove it and try again. Your message is still here.",
  retry: "Retry reply",
  // In the box, under a message kept from an earlier visit, for the images
  // it had, which weren't kept.
  notKept: (count: number): string => {
    if (count === 1) {
      return "The image you added to this message wasn't kept. Add it again before you send.";
    }
    return `The ${count} images you added to this message weren't kept. Add them again before you send.`;
  },
};

export { IMAGE_COPY };
