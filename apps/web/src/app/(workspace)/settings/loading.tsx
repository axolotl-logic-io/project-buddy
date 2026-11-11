import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { SignOutButtons } from "./sign-out-buttons.tsx";

export default function SettingsLoading(): JSX.Element {
  return (
    <div className="workspace-content flex flex-col gap-4">
      <LoadingSkeleton label={ACCOUNT_COPY.loading} shapes={["panel"]} />
      <SignOutButtons />
    </div>
  );
}
