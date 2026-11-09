"use client";

import type { JSX } from "react";
import { PageError } from "@/components/ui/page-error.tsx";

export default function SegmentError({
  error,
  retry,
}: {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}): JSX.Element {
  return <PageError error={error} retry={retry} />;
}
