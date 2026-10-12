import type { JSX } from "react";
import { SignInPanel } from "@/app/login/sign-in-panel.tsx";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";

// What the page a sign-in link opens shows while it checks the link.
export default function LoginLinkLoading(): JSX.Element {
  return (
    <SignInPanel intro={LINK_PAGE_COPY.loading}>
      <LoadingSkeleton label={LINK_PAGE_COPY.loading} shapes={["line"]} />
    </SignInPanel>
  );
}
