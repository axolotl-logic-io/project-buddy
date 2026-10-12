import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

// The Blender Reference Manual is CC BY-SA 4.0; its license requires this attribution.
export function SiteFooter(): JSX.Element {
  return (
    <footer className="px-6 py-4 text-center text-muted text-sm">
      <p>
        {COPY.footer.credit(
          <a
            className="text-link"
            href="https://docs.blender.org/manual/en/latest/"
            key="manual"
          >
            {COPY.footer.manual}
          </a>,
          <a
            className="text-link"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            key="license"
            rel="license"
          >
            {COPY.footer.license}
          </a>,
        )}
      </p>
    </footer>
  );
}
