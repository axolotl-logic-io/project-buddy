// The text of the Credits page.
import type { ReactNode } from "react";
import { pageTitle } from "./site.ts";

export const CREDITS_COPY = {
  title: pageTitle("Credits"),
  heading: "Credits",
  // The link to the page in the site menu, on every page.
  menuLink: "Credits",
  // A sentence that contains a link is a function of the link, so the
  // sentence reads whole here and its spacing stays in the sentence. Elements
  // passed in need keys, because the sentence comes back as a list.
  iconCredit: (libraryLink: ReactNode, licenseLink: ReactNode): ReactNode[] => [
    "Place icons by ",
    libraryLink,
    ", licensed under the ",
    licenseLink,
    ".",
  ],
  iconLibrary: "Lucide",
  iconLicense: "ISC License",
} as const;
