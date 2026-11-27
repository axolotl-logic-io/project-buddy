import type { JSX } from "react";
import SiteLayout from "./(stream)/(site)/layout.tsx";
import NotFound from "./(stream)/(site)/not-found.tsx";

// Unmatched addresses have no active site route group.
export default function UnmatchedPage(): JSX.Element {
  return (
    <SiteLayout header={null}>
      <NotFound />
    </SiteLayout>
  );
}
