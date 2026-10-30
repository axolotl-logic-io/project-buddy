import Link from "next/link";
import type { JSX } from "react";
import { FOOTER_COPY } from "@/ui/copy/footer.ts";

// Every page offers a route to the site's attribution.
export function SiteFooter(): JSX.Element {
  return (
    <footer className="px-6 py-4 text-center text-muted text-sm">
      <Link
        className="inline-flex min-h-(--target-size) items-center text-link"
        href="/credits"
      >
        {FOOTER_COPY.credits}
      </Link>
    </footer>
  );
}
