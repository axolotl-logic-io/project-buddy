import type { JSX } from "react";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { SETUP_COPY } from "@/ui/copy/invitations.ts";

// What the page a sign-in link opens shows while it checks the link.
export default function SetupLoading(): JSX.Element {
  return (
    <SignInPanel intro={SETUP_COPY.loading}>
      <LoadingSkeleton label={SETUP_COPY.loading} shapes={["line"]} />
    </SignInPanel>
  );
}
