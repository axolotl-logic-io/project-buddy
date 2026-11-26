import type { Metadata } from "next";
import Link from "next/link";
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
      <div className="panel flex flex-col gap-4" data-frame="feature">
        <h1 className="page-heading">{CREDITS_COPY.heading}</h1>
        <p>
          {CREDITS_COPY.iconCredit(
            <a className="text-link" href="https://lucide.dev" key="lucide">
              {CREDITS_COPY.iconLibrary}
            </a>,
            <Link
              className="text-link"
              href="/licenses/lucide.txt"
              key="isc"
              prefetch={false}
              rel="license"
            >
              {CREDITS_COPY.iconLicense}
            </Link>,
          )}
        </p>
      </div>
    </div>
  );
}
