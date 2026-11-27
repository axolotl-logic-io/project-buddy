import type { JSX } from "react";
import { ExperienceFeedback } from "@/components/experience/experience-feedback.tsx";
import { SignedInHeader } from "@/components/signed-in-header.tsx";

// Keep both slots under the same segment across page changes. The shared
// loading boundary can then retain this layout until both slots are ready.
export default function SiteLayout({
  header,
  children,
}: Pick<LayoutProps<"/">, "header" | "children">): JSX.Element {
  return (
    <>
      <ExperienceFeedback>{header ?? <SignedInHeader />}</ExperienceFeedback>
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
