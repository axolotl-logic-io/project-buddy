// The tools the tutor may call while it replies, and the context they get.
// To add a tool:
// 1. Put its name and the zod schema of its output in a contract file,
//    `<tool>-contract.ts`, such as `search-manual-contract.ts` holding
//    `SEARCH_MANUAL_TOOL = "search_manual"`. The contract imports nothing
//    from the server, because the tool's part component in the browser
//    imports it too, to look the part up and to parse the tool's output.
// 2. Build the tool with `tool()` in `<tool>.ts`, and add it to TUTOR_TOOLS
//    with one line in its type and one in its value, both keyed by the
//    contract's constant: `readonly [SEARCH_MANUAL_TOOL]: typeof
//    searchManualTool` and `[SEARCH_MANUAL_TOOL]: searchManualTool`. The type
//    keeps each tool's own types, which the AI SDK reads.
// 3. A tool that needs to know its chat or project declares
//    `contextSchema: TUTOR_TOOL_CONTEXT`. TypeScript then requires its entry
//    in tutorToolsContext below, `[UPDATE_MEMORY_TOOL]: context`, and the tool
//    reads it as `context` in its execute options.
// 4. Register its part in TOOL_PARTS, in
//    `src/components/chat/tool-parts.tsx`: its `render`; its `failure`
//    line, a `COPY.toolFailures` entry the chat shows when a call fails; and
//    its `placement`, "inline" where the call arrived or "under" the
//    message, and, if inline, its `textBefore`: "working-note" for a tool
//    that looks something up, "prose" otherwise. A test fails while a tool
//    has no part.
import type { streamText } from "ai";
import { citeManualTool } from "@/tutor/tools/cite-manual.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { searchManualTool } from "@/tutor/tools/search-manual.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import type { TutorToolContext } from "@/tutor/tools/tutor-tool-context.ts";
import { updateMemoryTool } from "@/tutor/tools/update-memory.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

const TUTOR_TOOLS: {
  readonly [CITE_MANUAL_TOOL]: typeof citeManualTool;
  readonly [SEARCH_MANUAL_TOOL]: typeof searchManualTool;
  readonly [UPDATE_MEMORY_TOOL]: typeof updateMemoryTool;
} = {
  [CITE_MANUAL_TOOL]: citeManualTool,
  [SEARCH_MANUAL_TOOL]: searchManualTool,
  [UPDATE_MEMORY_TOOL]: updateMemoryTool,
};

// The streamText setting that hands each tool that declares a context its
// context: `{ toolsContext: { [toolName]: context } }`, or nothing while no
// tool declares one.
type TutorToolsContextSetting = Pick<
  Parameters<typeof streamText<typeof TUTOR_TOOLS>>[0],
  "toolsContext"
>;

// The tools' context in the reply to one chat.
function tutorToolsContext(
  context: TutorToolContext,
): TutorToolsContextSetting {
  return { toolsContext: { [UPDATE_MEMORY_TOOL]: context } };
}

export { TUTOR_TOOLS, tutorToolsContext };
