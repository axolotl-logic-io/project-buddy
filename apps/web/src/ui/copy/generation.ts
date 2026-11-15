const GENERATION_COPY = {
  download: "Download image",
  view: "View full image",
  working: "Generating your image… This can take up to two minutes.",
  pending:
    "Generation was started. If it was interrupted, it will not restart automatically. Check its conversation before asking again.",
  outOfGold: "Image generation is unavailable.",
  quotaUsedUp: "Image generation is unavailable.",
  unavailable:
    "Image generation is unavailable. The site owner needs to configure the image provider.",
  failed: "The image could not be generated or saved. Please try again later.",
} as const;

export { GENERATION_COPY };
