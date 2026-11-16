"use client";

import type { JSX } from "react";
import { PageError } from "@/components/ui/page-error.tsx";

export default function ProfileError({
  error,
  retry,
}: {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}): JSX.Element {
  return (
    <div className="workspace-content flex flex-col gap-4">
      <PageError error={error} retry={retry} />
    </div>
  );
}
