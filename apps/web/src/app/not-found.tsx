import type { JSX } from "react";
import { PageFrame } from "@/components/ui/page-frame.tsx";
import { PageNotFound } from "@/components/ui/page-not-found.tsx";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";

// What an address the site doesn't have shows, and any page whose
// notFound() no closer not-found page catches, such as Invitations for an
// ordinary user. A missing quest or adventure says so instead (the
// not-found pages of their own segments).
export default function NotFound(): JSX.Element {
  return (
    <PageFrame>
      <PageNotFound message={PROBLEMS_COPY.pageNotFound} />
    </PageFrame>
  );
}
