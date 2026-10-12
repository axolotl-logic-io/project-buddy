// The text of the site's footer.
import type { ReactNode } from "react";

export const FOOTER_COPY = {
  // A sentence that contains a link is a function of the link, so the
  // sentence reads whole here and its spacing stays in the sentence. Elements
  // passed in need keys, because the sentence comes back as a list.
  credit: (manualLink: ReactNode, licenseLink: ReactNode): ReactNode[] => [
    "Includes content adapted from the ",
    manualLink,
    ", licensed under ",
    licenseLink,
    ".",
  ],
  manual: "Blender Reference Manual",
  license: "CC BY-SA 4.0",
} as const;
