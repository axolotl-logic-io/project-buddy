"use client";

import {
  type JSX,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
} from "react";
import { usePagePending } from "@/components/pending-page-context.ts";
import { subscribeToPageChanges } from "@/instrumentation-client.ts";
import { SITE_COPY } from "@/ui/copy/site.ts";

function PageChangeBand({
  children,
  loading,
}: {
  readonly children: ReactNode;
  readonly loading: boolean | undefined;
}): JSX.Element {
  const bandRef = useRef<HTMLElement>(null);

  // Message jumps clear the pinned header, and the panel controls match
  // the breadcrumb row even when the page title wraps.
  useLayoutEffect(() => {
    const band = bandRef.current;
    if (band === null) {
      return;
    }
    const element = band;
    const root = document.documentElement.style;
    function measure(): void {
      root.setProperty("--page-header-height", `${element.offsetHeight}px`);
      root.setProperty("--panel-tab-height", `${element.clientHeight}px`);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(band, { box: "border-box" });
    measure();
    return (): void => {
      observer.disconnect();
      root.removeProperty("--page-header-height");
      root.removeProperty("--panel-tab-height");
    };
  }, []);

  const [changingPage, setChangingPage] = useOptimistic(false);
  useEffect(
    () =>
      subscribeToPageChanges(() => {
        setChangingPage(true);
      }),
    [setChangingPage],
  );

  const pagePending = usePagePending();
  let busy: true | undefined;
  if (loading === true || changingPage || pagePending) {
    busy = true;
  }

  return (
    <section
      aria-busy={busy}
      aria-label={SITE_COPY.breadcrumbs}
      className="trail-band"
      ref={bandRef}
    >
      {children}
      <div className="trail-loading" role="status">
        <span className="sr-only">{busy === true && SITE_COPY.loading}</span>
      </div>
    </section>
  );
}

export { PageChangeBand };
