import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";

export default function QuickCaptureLoading(): JSX.Element {
  return (
    <LoadingSkeleton
      label={QUICK_CAPTURE_COPY.loading}
      shapes={["heading", "line", "panel"]}
    />
  );
}
