"use client";

import React, { type JSX, type ReactNode, useMemo, useOptimistic } from "react";
import type { Breadcrumb } from "@/components/breadcrumb.ts";
import {
  type PendingPage,
  PendingPagesContext,
  usePendingPage,
} from "@/components/pending-page-context.ts";
import { TrailBand } from "@/components/trail-band.tsx";

// Biome can't read the components React's types declare, so Activity is
// read from the default export.
const Activity: typeof React.Activity = React.Activity;

// How the current page shows while another is pending: hidden, not taken
// away, so it is as the user left it if the other page is refused.
function modeWhile(page: PendingPage | undefined): "hidden" | "visible" {
  if (page === undefined) {
    return "visible";
  }
  return "hidden";
}

// The site layout's page header and content, which a pending page takes
// over.
function PendingPages({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const [page, show] = useOptimistic<PendingPage | undefined>(undefined);
  const value = useMemo(() => ({ page, show }), [page, show]);
  return <PendingPagesContext value={value}>{children}</PendingPagesContext>;
}

// The trail band's trail, or a pending page's.
function Trail({
  items,
}: {
  readonly items: readonly Breadcrumb[];
}): JSX.Element {
  const page = usePendingPage();
  return (
    <>
      <Activity mode={modeWhile(page)}>
        <TrailBand items={items} />
      </Activity>
      {page !== undefined && <TrailBand items={page.trail(items)} />}
    </>
  );
}

// The page's content, or a pending page's.
function PendingMain({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const page = usePendingPage();
  return (
    <>
      <Activity mode={modeWhile(page)}>{children}</Activity>
      {page?.main}
    </>
  );
}

export { PendingMain, PendingPages, Trail };
