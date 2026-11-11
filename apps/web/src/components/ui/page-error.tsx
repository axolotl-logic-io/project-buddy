"use client";

import Link from "next/link";
import { type JSX, useEffect, useSyncExternalStore } from "react";
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

// The trail band's heading names the page wherever there is a band, and it
// stays in the header when the page fails. Nothing changes it while the
// error shows, so there is nothing to subscribe to.
function subscribeToNothing(): () => void {
  return (): void => undefined;
}

function hasTrailHeading(): boolean {
  return document.querySelector(".trail-heading") !== null;
}

function noTrailHeadingOnServer(): boolean {
  return false;
}

// What any page or Server Action that failed shows instead: the failure's
// case message, read from the digest an AppError carries (see app-error.ts),
// under the heading "Something went wrong": the page's heading, or a
// section's under the trail band's. Any other error says only to
// try again later, so the page doesn't say twice that something went
// wrong. A digest that names a case
// this build doesn't know came from a newer build, mid-deploy: the page
// reloads once to pick that build up, and shows the unknown message if it
// already did within the last minute (newer-build-reload.ts).
// A page that failed while rendering arrives without <head>'s pre-paint
// scripts, so SavedChoices applies the saved theme.
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

  const banded = useSyncExternalStore(
    subscribeToNothing,
    hasTrailHeading,
    noTrailHeadingOnServer,
  );
  let Heading: "h1" | "h2" = "h1";
  if (banded) {
    Heading = "h2";
  }
  const errorCase = readAppErrorCase(error.digest);
  let message = userMessage(errorCase);
  if (errorCase === "unknown") {
    message = PROBLEMS_COPY.unknownError;
  }
  return (
    <div className="panel flex flex-col gap-4">
      <SavedChoices />
      <Heading className="page-heading">{PROBLEMS_COPY.errorHeading}</Heading>
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
