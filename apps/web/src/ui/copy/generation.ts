import { pageTitle } from "@/ui/copy/site.ts";

const GENERATION_COPY = {
  title: pageTitle("Image gallery"),
  heading: "Image gallery",
  empty:
    "No generated images yet. Ask your construct to create an image in a conversation.",
  context:
    "Images belong to the conversation they came from. Deleting its quest also deletes its images. Downloads you have saved are yours to keep.",
  download: "Download image",
  view: "View full image",
  source: "Open its conversation",
  older: "Older images",
  loading: "Loading image gallery",
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
