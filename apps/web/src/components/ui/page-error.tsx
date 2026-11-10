"use client";

import Link from "next/link";
import { type JSX, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Alert } from "@/components/ui/form-message.tsx";
import { SavedChoices } from "@/components/ui/saved-choices.tsx";
import {
  isUnrecognisedCaseName,
  readAppErrorCase,
  userMessage,
} from "@/errors/app-error.ts";
import { reloadForNewerBuild } from "@/errors/newer-build-reload.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";

// What any page or Server Action that failed shows instead: the failure's
// case message, read from the digest an AppError carries (see app-error.ts),
// under the heading "Something went wrong". Any other error says only to
// try again later, so the page doesn't say twice that something went
// wrong. A digest that names a case
// this build doesn't know came from a newer build, mid-deploy: the page
// reloads once to pick that build up, and shows the unknown message if it
// already did within the last minute (newer-build-reload.ts).
// A page that failed while rendering arrives without <head>'s pre-paint
// scripts, so SavedChoices applies the saved theme and hidden extras.
function PageError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}): JSX.Element {
  useEffect(() => {
    if (isUnrecognisedCaseName(error.digest)) {
      reloadForNewerBuild();
    }
  }, [error.digest]);

  const errorCase = readAppErrorCase(error.digest);
  let message = userMessage(errorCase);
  if (errorCase === "unknown") {
    message = PROBLEMS_COPY.unknownError;
  }
  return (
    <div className="panel flex flex-col gap-4">
      <SavedChoices />
      <h1 className="page-heading">{PROBLEMS_COPY.errorHeading}</h1>
      <Alert>{message}</Alert>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={retry}>{PROBLEMS_COPY.retry}</Button>
        <Button asChild={true} variant="secondary">
          <Link href="/projects">{PROBLEMS_COPY.projectsLink}</Link>
        </Button>
      </div>
    </div>
  );
}

export { PageError };
