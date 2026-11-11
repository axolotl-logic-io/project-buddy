import type { Content } from "@/journal/journal.ts";
import { JOURNAL_SECTIONS_COPY as COPY } from "@/ui/copy/journal.ts";

function contentText(content: Content): string {
  if (content.kind === "goal") {
    return content.text || COPY.emptyGoal;
  }
  return (
    content.items.map((item) => `#${item.number} ${item.text}`).join("\n") ||
    COPY.emptyPreferences
  );
}

export { contentText };
