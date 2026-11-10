import type { JSX } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton.tsx";
import { QUICK_CAPTURE_COPY } from "@/ui/copy/notes.ts";

// The Quick Note page while it loads, inside the same workspace frame the
// page draws, so the frame doesn't appear only once the form arrives.
export default function QuickCaptureLoading(): JSX.Element {
  return (
    <div className="page-workspace p-4 sm:p-6">
      <LoadingSkeleton
        label={QUICK_CAPTURE_COPY.loading}
        shapes={["heading", "line", "panel"]}
      />
    </div>
  );
}
