import type { JSX } from "react";
import { FOOTER_COPY } from "@/ui/copy/footer.ts";

// The Blender Reference Manual is CC BY-SA 4.0; its license requires this attribution.
export function SiteFooter(): JSX.Element {
  return (
    <footer className="px-6 py-4 text-center text-muted text-sm">
      <p>
        {FOOTER_COPY.credit(
          <a
            className="text-link"
            href="https://docs.blender.org/manual/en/latest/"
            key="manual"
          >
            {FOOTER_COPY.manual}
          </a>,
          <a
            className="text-link"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            key="license"
            rel="license"
          >
            {FOOTER_COPY.license}
          </a>,
        )}
      </p>
    </footer>
  );
}
