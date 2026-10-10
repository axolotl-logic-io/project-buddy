import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";

export default function ChatLoading(): JSX.Element {
  return <p>{COPY.chat.loading}</p>;
}
