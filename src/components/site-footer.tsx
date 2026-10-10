import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

// The Blender Reference Manual is CC BY-SA 4.0; its license requires this attribution.
export function SiteFooter(): JSX.Element {
  return (
    <footer className="site-footer">
      <p>
        {COPY.footer.beforeManual}
        <a
          className="site-footer-link"
          href="https://docs.blender.org/manual/en/latest/"
        >
          {COPY.footer.manual}
        </a>
        {COPY.footer.beforeLicense}
        <a
          className="site-footer-link"
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          rel="license"
        >
          {COPY.footer.license}
        </a>
        {COPY.footer.end}
      </p>
    </footer>
  );
}
