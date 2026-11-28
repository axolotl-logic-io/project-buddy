import type { Route } from "next";
import Link from "next/link";
import type { JSX } from "react";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

// A breadcrumb that leads somewhere: every one but the current page.
function isLink(item: Breadcrumb): item is Breadcrumb & { href: Route } {
  return item.href !== undefined;
}

// The links to the pages above the current page, small and muted, lead
// into the current page's name. Each parent is a full-size target with
// its whole name available to assistive technology.
// The last item is the current page; an empty trail draws no content.
function TrailBand({
  items,
}: {
  readonly items: readonly Breadcrumb[];
}): JSX.Element | null {
  const current = items.at(-1);
  if (current === undefined) {
    return null;
  }
  const parents = items.slice(0, -1).filter(isLink);
  return (
    <div className="trail-content">
      {parents.length > 0 && (
        <nav aria-label={SITE_COPY.breadcrumbs} className="trail-parents">
          <ol>
            {parents.map((parent) => (
              <li key={`${parent.href}/${parent.label}`}>
                <Link href={parent.href} title={parent.label}>
                  {parent.label}
                </Link>
                {parent.action}
                <span aria-hidden="true" className="breadcrumb-separator">
                  {SITE_COPY.breadcrumbSeparator}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      {/* page-error.tsx finds the band's heading by data-trail-heading. */}
      <h1 className="trail-heading" data-trail-heading="">
        {current.label}
      </h1>
      {current.action}
    </div>
  );
}

export { TrailBand };
