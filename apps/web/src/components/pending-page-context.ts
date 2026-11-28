"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { Breadcrumb } from "@/components/breadcrumb.ts";

// A page the user has just opened, which shows at once, before the
// server's arrives: its trail, made from the current page's, and its
// content.
interface PendingPage {
  readonly trail: (current: readonly Breadcrumb[]) => readonly Breadcrumb[];
  readonly main: ReactNode;
}

interface PendingPages {
  readonly page: PendingPage | undefined;
  readonly show: (page: PendingPage) => void;
}

// The site layout's pending page (pending-page.tsx).
const PendingPagesContext = createContext<PendingPages | undefined>(undefined);

// Outside the site layout, such as on the first load's shell, no page is
// ever pending.
function ignore(): void {
  // Nothing shows it.
}

// Shows a page in place of the current one until the transition it is
// called in ends: when the server's page takes its place, or when it is
// refused and the current page comes back as it was.
function useShowPage(): (page: PendingPage) => void {
  return useContext(PendingPagesContext)?.show ?? ignore;
}

// The page the user opened that is still on its way, if any.
function usePendingPage(): PendingPage | undefined {
  return useContext(PendingPagesContext)?.page;
}

// Whether a page the user opened is still on its way.
function usePagePending(): boolean {
  return usePendingPage() !== undefined;
}

export type { PendingPage, PendingPages };
export { PendingPagesContext, usePagePending, usePendingPage, useShowPage };
