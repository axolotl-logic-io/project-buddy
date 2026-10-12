import Link from "next/link";
import type { JSX } from "react";
import { ThemePicker } from "@/components/theme-picker.tsx";
import { SITE_COPY } from "@/ui/copy/site.ts";

// The top of every page, signed in or not: the site's name, linking home,
// and the theme picker.
export function SiteHeader(): JSX.Element {
  return (
    <header className="flex items-center justify-between gap-4 border-line border-b bg-surface px-6 py-3 shadow-control">
      <Link className="header-title" href="/">
        {SITE_COPY.name}
      </Link>
      <ThemePicker />
    </header>
  );
}
