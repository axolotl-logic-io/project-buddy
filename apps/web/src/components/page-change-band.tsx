"use client";

import { type JSX, type ReactNode, useEffect, useOptimistic } from "react";
import { subscribeToPageChanges } from "@/instrumentation-client.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

function PageChangeBand({
  children,
  loading,
}: {
  readonly children: ReactNode;
  readonly loading: boolean | undefined;
}): JSX.Element {
  const [changingPage, setChangingPage] = useOptimistic(false);
  useEffect(
    () =>
      subscribeToPageChanges(() => {
        setChangingPage(true);
      }),
    [setChangingPage],
  );

  let busy: true | undefined;
  if (loading === true || changingPage) {
    busy = true;
  }

  return (
    <section
      aria-busy={busy}
      aria-label={SITE_COPY.breadcrumbs}
      className="trail-band"
    >
      {children}
      <div className="trail-loading" role="status">
        <span className="sr-only">{busy === true && SITE_COPY.loading}</span>
      </div>
    </section>
  );
}

export { PageChangeBand };
