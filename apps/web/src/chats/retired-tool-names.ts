// Tool names that saved messages may still hold. Before #549 the Blender
// manual lookup's tools were search_manual and cite_manual; a message saved
// then keeps its parts' old types until a later release rewrites them. The
// chat store reads each such part under its tool's current name, so the
// chat shows it and the model sees the call as the tool it has now.
import { CITE_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/cite-tool-contract.ts";
import { SEARCH_BLENDER_MANUAL_TOOL } from "@/skills/blender-manual/search-tool-contract.ts";

// Each retired tool part type, and the type its tool's parts have now.
const RETIRED_TOOL_PART_TYPES: ReadonlyMap<string, string> = new Map([
  ["tool-search_manual", `tool-${SEARCH_BLENDER_MANUAL_TOOL}`],
  ["tool-cite_manual", `tool-${CITE_BLENDER_MANUAL_TOOL}`],
]);

// The stored parts, with each part of a retired tool under its tool's
// current name. Anything that is not a list of parts is returned as it is,
// for the store's validation to reject.
function withCurrentToolNames(parts: unknown): unknown {
  if (!Array.isArray(parts)) {
    return parts;
  }
  return parts.map((part: unknown) => {
    if (typeof part !== "object" || part === null || !("type" in part)) {
      return part;
    }
    const current = RETIRED_TOOL_PART_TYPES.get(String(part.type));
    if (current === undefined) {
      return part;
    }
    return { ...part, type: current };
  });
}

export { withCurrentToolNames };
