import type { JSX } from "react";
import { PageNotFound } from "@/components/ui/page-not-found.tsx";
import { userMessage } from "@/errors/app-error.ts";

// An adventure that doesn't exist, or that the user can't open, inside its
// layout's frame.
export default function AdventureNotFound(): JSX.Element {
  return <PageNotFound message={userMessage("not-found")} />;
}
