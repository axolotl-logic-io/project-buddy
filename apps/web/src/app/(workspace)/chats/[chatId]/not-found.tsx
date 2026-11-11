import type { JSX } from "react";
import { PageNotFound } from "@/components/ui/page-not-found.tsx";
import { userMessage } from "@/errors/app-error.ts";

// A conversation that doesn't exist, or that the user can't open.
export default function ConversationNotFound(): JSX.Element {
  return <PageNotFound message={userMessage("not-found")} />;
}
