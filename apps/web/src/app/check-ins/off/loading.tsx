import type { JSX } from "react";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { CHECK_INS_OFF_COPY } from "@/ui/copy/check-ins.ts";

// What the page a check-in email's link to turn check-ins off opens shows
// while it checks the link.
export default function CheckInsOffLoading(): JSX.Element {
  return (
    <SignInPanel intro={CHECK_INS_OFF_COPY.loading}>
      <LoadingSkeleton label={CHECK_INS_OFF_COPY.loading} shapes={["line"]} />
    </SignInPanel>
  );
}
