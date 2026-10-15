// The tools the tutor may call while it replies, and the context they get.
// To add a tool:
// 1. Put its name and the zod schema of its output in a contract file,
//    `<tool>-contract.ts`, such as `search-manual-contract.ts` holding
//    `SEARCH_MANUAL_TOOL = "search_manual"`. The contract imports nothing
//    from the server, because the tool's part component in the browser
//    imports it too, to look the part up and to parse the tool's output.
// 2. Build the tool with `tool()` in `<tool>.ts`, with its default
//    description in the contract, and make its description a buddy part
//    (src/buddies/buddy.ts). Add it to TutorTools with one line, keyed by
//    the contract's constant, `[SEARCH_MANUAL_TOOL]: typeof
//    searchManualTool`, which keeps the tool's own types for the AI SDK, and
//    to tutorTools with one line that sets its description from the part.
//    The provider gets the tools in tutorTools's order; keep the cache
//    breakpoint on the last one.
// 3. A tool that needs to know its chat or project declares
//    `contextSchema: TUTOR_TOOL_CONTEXT`. TypeScript then requires its entry
//    in tutorToolsContext below, `[UPDATE_MEMORY_TOOL]: context`, and the tool
//    reads it as `context` in its execute options.
// 4. Register its part in TOOL_PARTS, in
//    `src/components/chat/tool-parts.tsx`: its `render`; its `failure`
//    line, a `TOOL_FAILURES_COPY` entry the chat shows when a call fails; and
//    its `placement`, "inline" where the call arrived or "under" the
//    message, and, if inline, its `textBefore`: "working-note" for a tool
//    that looks something up, "prose" otherwise. A test fails while a tool
//    has no part.
import type { SharedV4ProviderOptions } from "@ai-sdk/provider";
import type { streamText, Tool } from "ai";
import type { BuddyParts } from "@/buddies/buddy.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { citeManualTool } from "@/tutor/tools/cite-manual.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { searchManualTool } from "@/tutor/tools/search-manual.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import type { TutorToolContext } from "@/tutor/tools/tutor-tool-context.ts";
import { updateMemoryTool } from "@/tutor/tools/update-memory.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

// A type alias, not an interface, as the AI SDK's tool set must be a plain
// record.
type TutorTools = Readonly<{
  [CITE_MANUAL_TOOL]: typeof citeManualTool;
  [SEARCH_MANUAL_TOOL]: typeof searchManualTool;
  [UPDATE_MEMORY_TOOL]: typeof updateMemoryTool;
}>;

// What one request sets on a tool: its description, a buddy part, and its
// provider options, such as a cache breakpoint. Its input fields'
// descriptions stay fixed.
interface ToolSettings {
  readonly description: string;
  readonly providerOptions?: SharedV4ProviderOptions;
}

// tutorTool, a copy with settings, of the same type.
function withSettings<TutorTool extends Tool>(
  tutorTool: TutorTool,
  settings: ToolSettings,
): TutorTool {
  return { ...tutorTool, ...settings };
}

// The buddy parts that describe the tools.
type TutorToolDescriptions = Pick<
  BuddyParts,
  "citeManualTool" | "searchManualTool" | "updateMemoryTool"
>;

// The tools, described as descriptions say, for one request, in the order
// the provider gets them. The last one ends the tools with a cache
// breakpoint, so they stay cached when a part in the system prompt after
// them changes.
function tutorTools(descriptions: TutorToolDescriptions): TutorTools {
  return {
    [CITE_MANUAL_TOOL]: withSettings(citeManualTool, {
      description: descriptions.citeManualTool,
    }),
    [SEARCH_MANUAL_TOOL]: withSettings(searchManualTool, {
      description: descriptions.searchManualTool,
    }),
    [UPDATE_MEMORY_TOOL]: withSettings(updateMemoryTool, {
      description: descriptions.updateMemoryTool,
      providerOptions: PROMPT_CACHE_BREAKPOINT,
    }),
  };
}

// The streamText setting that hands each tool that declares a context its
// context: `{ toolsContext: { [toolName]: context } }`, or nothing while no
// tool declares one.
type TutorToolsContextSetting = Pick<
  Parameters<typeof streamText<TutorTools>>[0],
  "toolsContext"
>;

// The tools' context in the reply to one chat.
function tutorToolsContext(
  context: TutorToolContext,
): TutorToolsContextSetting {
  return { toolsContext: { [UPDATE_MEMORY_TOOL]: context } };
}

export type { TutorToolDescriptions, TutorTools };
export { tutorTools, tutorToolsContext };
