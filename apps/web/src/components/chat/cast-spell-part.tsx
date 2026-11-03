import type { JSX } from "react";
import type { ToolCallPart } from "@/components/chat/tool-parts.tsx";
import { Icon } from "@/components/ui/icon.tsx";
import { CAST_SPELL_OUTPUT } from "@/spells/cast-spell-contract.ts";
import { CAST_SPELL_COPY } from "@/ui/copy/chat.ts";

// The spell the buddy cast, as a line where the call arrived. A call that
// cast none shows nothing: the buddy's reply carries on without it.
// Nothing shows until the call has answered.
export function CastSpellPart({
  part,
}: {
  part: Pick<ToolCallPart, "result">;
}): JSX.Element | null {
  const output = CAST_SPELL_OUTPUT.safeParse(part.result);
  if (!output.success || output.data.status !== "cast") {
    return null;
  }
  return (
    <p className="icon-line text-muted text-sm">
      <Icon name="book" />
      {CAST_SPELL_COPY.cast(output.data.name)}
    </p>
  );
}
