import type { JSX } from "react";
import type { ReplyCost } from "@/replies/reply-accounting.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";

function ReplyCostLabel({
  cost,
}: {
  readonly cost: ReplyCost | undefined;
}): JSX.Element {
  if (cost === undefined) {
    return <p className="text-muted text-xs">{CHAT_COPY.costUnknown}</p>;
  }
  if (cost.state === "pending") {
    return <p className="text-muted text-xs">{CHAT_COPY.costPending}</p>;
  }
  if (cost.state === "unknown") {
    return <p className="text-muted text-xs">{CHAT_COPY.costUnknown}</p>;
  }
  return <p className="text-muted text-xs">{CHAT_COPY.replyCost(cost.gold)}</p>;
}

export { ReplyCostLabel };
