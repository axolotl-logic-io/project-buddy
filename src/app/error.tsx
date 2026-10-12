"use client";

import Link from "next/link";
import type { JSX } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { readAppErrorCase, userMessage } from "@/errors/app-error.ts";
import { COPY } from "@/ui/copy.ts";

// What any page or Server Action that failed shows instead: the failure's
// case message, read from the digest an AppError carries (see app-error.ts),
// or the unknown message for any other error.
export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): JSX.Element {
  return (
    <div className="page-column">
      <div className="panel flex flex-col gap-4">
        <h1 className="page-heading">{COPY.problems.errorHeading}</h1>
        <Alert>{userMessage(readAppErrorCase(error.digest))}</Alert>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={retry}>{COPY.problems.retry}</Button>
          <Button asChild={true} variant="secondary">
            <Link href="/projects">{COPY.problems.projectsLink}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
