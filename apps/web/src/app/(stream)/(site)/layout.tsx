import type { JSX } from "react";
import { ExperienceFeedback } from "@/components/experience/experience-feedback.tsx";
import { PendingPages } from "@/components/pending-page.tsx";
import { SignedInHeader } from "@/components/signed-in-header.tsx";

// Keep both slots under the same segment across page changes. The shared
// loading boundary can then retain this layout until both slots are ready.
// A page the user opens can show in both at once, before the server's.
export default function SiteLayout({
  header,
  children,
}: Pick<LayoutProps<"/">, "header" | "children">): JSX.Element {
  return (
    <PendingPages>
      <ExperienceFeedback>{header ?? <SignedInHeader />}</ExperienceFeedback>
      <main className="flex flex-1 flex-col">{children}</main>
    </PendingPages>
  );
}
