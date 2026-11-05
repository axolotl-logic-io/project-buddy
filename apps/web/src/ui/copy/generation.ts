import { pageTitle } from "@/ui/copy/site.ts";

const GENERATION_COPY = {
  title: pageTitle("Image gallery"),
  heading: "Image gallery",
  home: "Home",
  empty:
    "No generated images yet. Ask your guildmate to create an image in a chat.",
  context:
    "Images belong to their source chat. Deleting that chat or its quest also deletes its images. Downloads you have saved are yours to keep.",
  download: "Download image",
  view: "View full image",
  source: "Open source chat",
  older: "Older images",
  loading: "Loading image gallery",
  working: "Generating your image… This can take up to two minutes.",
  pending:
    "Generation was started. If it was interrupted, it will not restart automatically. Check the source chat before asking again.",
  outOfGold: "You don't have enough gold left to generate an image.",
  quotaUsedUp: "You don't have enough gold left to generate an image.",
  unavailable:
    "Image generation is unavailable. The site owner needs to configure the image provider.",
  failed:
    "The image could not be generated or saved. Please try again later. A possibly billed request keeps the gold it set aside.",
} as const;

export { GENERATION_COPY };
