import type { Metadata } from "next";
import type { JSX } from "react";
import { CREDITS_COPY } from "@/ui/copy/credits.ts";

export const metadata: Metadata = {
  title: CREDITS_COPY.title,
};

// Public attribution for adapted content and place icons, on a panel as the
// not-found and error pages are.
export default function CreditsPage(): JSX.Element {
  return (
    <div className="page-column">
      <div className="panel flex flex-col gap-4">
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
        <p>
          {CREDITS_COPY.iconCredit(
            <a className="text-link" href="https://lucide.dev" key="lucide">
              {CREDITS_COPY.iconLibrary}
            </a>,
            <a
              className="text-link"
              href="/licenses/lucide.txt"
              key="isc"
              rel="license"
            >
              {CREDITS_COPY.iconLicense}
            </a>,
          )}
        </p>
      </div>
    </div>
  );
}
