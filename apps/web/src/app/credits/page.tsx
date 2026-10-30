import type { Metadata } from "next";
import type { JSX } from "react";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";

export const metadata: Metadata = {
  title: CREDITS_COPY.title,
};

// Public attribution for content adapted from the Blender Reference Manual.
export default function CreditsPage(): JSX.Element {
  return (
    <div className="page-column">
      <h1 className="page-heading">{CREDITS_COPY.heading}</h1>
      <p>
        {CREDITS_COPY.credit(
          <a
            className="text-link"
            href="https://docs.blender.org/manual/en/latest/"
            key="manual"
          >
            {CREDITS_COPY.manual}
          </a>,
          <a
            className="text-link"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            key="license"
            rel="license"
          >
            {CREDITS_COPY.license}
          </a>,
        )}
      </p>
    </div>
  );
}
