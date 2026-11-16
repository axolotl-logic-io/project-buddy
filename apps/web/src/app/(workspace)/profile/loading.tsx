import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { PROFILE_COPY } from "@/ui/copy/profile.ts";

export default function ProfileLoading(): JSX.Element {
  return (
    <div className="workspace-content flex flex-col gap-4">
      <LoadingSkeleton label={PROFILE_COPY.loading} shapes={["panel"]} />
    </div>
  );
}
