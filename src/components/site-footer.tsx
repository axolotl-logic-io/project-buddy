import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

// The Blender Reference Manual is CC BY-SA 4.0; its license requires this attribution.
export function SiteFooter(): JSX.Element {
  return (
    <footer className="site-footer">
      <p>
        {COPY.footer.credit(
          <a
            className="site-footer-link"
            href="https://docs.blender.org/manual/en/latest/"
            key="manual"
          >
            {COPY.footer.manual}
          </a>,
          <a
            className="site-footer-link"
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
