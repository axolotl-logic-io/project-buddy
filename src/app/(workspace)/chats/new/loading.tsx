import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

export default function NewChatLoading(): JSX.Element {
  return <p>{COPY.projects.loading}</p>;
}
