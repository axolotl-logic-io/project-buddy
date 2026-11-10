import type { JSX } from "react";
import { PageNotFound } from "@/components/ui/page-not-found.tsx";
import { userMessage } from "@/errors/app-error.ts";

// The Journal of a quest that doesn't exist, or that the user can't open,
// inside its layout's frame.
export default function JournalNotFound(): JSX.Element {
  return <PageNotFound message={userMessage("not-found")} />;
}
