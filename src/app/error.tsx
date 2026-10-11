"use client";

import Link from "next/link";
import type { JSX } from "react";
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-10">
      <h1 className="page-heading">{COPY.problems.errorHeading}</h1>
      <p className="error-text" role="alert">
        {userMessage(readAppErrorCase(error.digest))}
      </p>
      <div className="flex items-center gap-4">
        <button className="button-primary" onClick={retry} type="button">
          {COPY.problems.retry}
        </button>
        <Link className="text-link" href="/projects">
          {COPY.problems.projectsLink}
        </Link>
      </div>
    </div>
  );
}
