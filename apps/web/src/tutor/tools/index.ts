// The tools the tutor may call while it replies, which depend on where the
// chat is, the context they get, and the model calls that send them. The
// only module that knows the tool set. To add a tool:
// 1. Put its name and the zod schema of its output in a contract file,
//    `<tool>-contract.ts`, such as `search-manual-contract.ts` holding
//    `SEARCH_MANUAL_TOOL = "search_manual"`. The contract imports nothing
//    from the server, because the tool's part component in the browser
//    imports it too, to look the part up and to parse the tool's output.
// 2. Build the tool with `tool()` in `<tool>.ts`, with its default
//    description in the contract, and make its description a buddy part
//    (src/buddies/buddy.ts). Add it to the tool set of each place that
//    offers it, ProjectTools or CentralTools, with one line keyed by the
//    contract's constant, `[SEARCH_MANUAL_TOOL]: typeof searchManualTool`,
//    which keeps the tool's own types for the AI SDK, and to that place's
//    function, projectTools or centralTools, with one line that sets its
//    description from the part. The provider gets the tools in that
//    function's order, and the last tool sent in each place carries the
//    cache breakpoint.
// 3. A tool that needs to know its chat or project declares
//    `contextSchema: TUTOR_TOOL_CONTEXT`. TypeScript then requires its entry
//    in the toolsContext of streamTutorCalls's place below,
//    `[UPDATE_MEMORY_TOOL]: context`, and the tool reads it as `context` in
//    its execute options.
// 4. Register its part in TOOL_PARTS, in
//    `src/components/chat/tool-parts.tsx`: its `render`; its `failure`
//    line, a `TOOL_FAILURES_COPY` entry the chat shows when a call fails; and
//    its `placement`, "inline" where the call arrived or "under" the
//    message, and, if inline, its `textBefore`: "working-note" for a tool
//    that looks something up, "prose" otherwise. A test fails while a tool
//    has no part.
import type {
  LanguageModelV4,
  SharedV4ProviderOptions,
} from "@ai-sdk/provider";
import {
  type isStepCount,
  type ModelMessage,
  type StepResult,
  type SystemModelMessage,
  streamText,
  type Tool,
} from "ai";
import type { BuddyParts } from "@/buddies/buddy.ts";
import type { ChatId, ProjectId, UserId } from "@/ids.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/tutor/prompt-cache.ts";
import { citeManualTool } from "@/tutor/tools/cite-manual.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { searchManualTool } from "@/tutor/tools/search-manual.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";
import { updateMemoryTool } from "@/tutor/tools/update-memory.ts";
import { UPDATE_MEMORY_TOOL } from "@/tutor/tools/update-memory-contract.ts";

// The tools in a project chat. A type alias, not an interface, as the AI
// SDK's tool set must be a plain record.
type ProjectTools = Readonly<{
  [CITE_MANUAL_TOOL]: typeof citeManualTool;
  [SEARCH_MANUAL_TOOL]: typeof searchManualTool;
  [UPDATE_MEMORY_TOOL]: typeof updateMemoryTool;
}>;

// The tools in the user's central chat, which is in no project and so has
// no memory to update.
type CentralTools = Readonly<{
  [CITE_MANUAL_TOOL]: typeof citeManualTool;
  [SEARCH_MANUAL_TOOL]: typeof searchManualTool;
}>;

// The tools of a chat in either place.
type TutorTools = ProjectTools | CentralTools;

// The chat a reply is in: in a project, or the user's central chat, which is
// in none.
type TutorToolsChat =
  | {
      readonly kind: "project";
      readonly id: ChatId;
      readonly projectId: ProjectId;
    }
  | { readonly kind: "central"; readonly id: ChatId };

// Where a chat is, which decides its tools.
type TutorToolsPlace = TutorToolsChat["kind"];

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

function projectTools(descriptions: TutorToolDescriptions): ProjectTools {
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

function centralTools(descriptions: TutorToolDescriptions): CentralTools {
  return {
    [CITE_MANUAL_TOOL]: withSettings(citeManualTool, {
      description: descriptions.citeManualTool,
    }),
    [SEARCH_MANUAL_TOOL]: withSettings(searchManualTool, {
      description: descriptions.searchManualTool,
      providerOptions: PROMPT_CACHE_BREAKPOINT,
    }),
  };
}

// The tools for one request in a chat in place, described as descriptions
// say, in the order the provider gets them. The last one ends the tools with
// a cache breakpoint, so they stay cached when a part in the system prompt
// after them changes.
function tutorTools(
  place: TutorToolsPlace,
  descriptions: TutorToolDescriptions,
): TutorTools {
  switch (place) {
    case "project":
      return projectTools(descriptions);
    case "central":
      return centralTools(descriptions);
    default: {
      const unknownPlace: never = place;
      return unknownPlace;
    }
  }
}

// The reply that model calls are for: the owner, their chat, and the buddy
// parts that describe the tools.
interface TutorToolsReply {
  readonly owner: UserId;
  readonly chat: TutorToolsChat;
  readonly toolDescriptions: TutorToolDescriptions;
}

// The streamText settings that the model calls of a reply share, whatever
// tools its chat gets.
interface TutorCallSettings {
  readonly model: LanguageModelV4;
  readonly instructions: SystemModelMessage[];
  readonly messages: ModelMessage[];
  readonly stopWhen: ReturnType<typeof isStepCount>;
  readonly providerOptions: SharedV4ProviderOptions;
  readonly onError: (event: { error: unknown }) => void;
}

// One model call of a reply, in either place, as the reply reads it.
type TutorStep = Pick<
  StepResult<ProjectTools>,
  "content" | "text" | "finishReason" | "rawFinishReason" | "usage"
>;

// What a reply reads from its model calls, in either place: its steps, the
// messages they add to the conversation, and the stream for the browser.
type TutorCalls = Pick<
  ReturnType<typeof streamText<CentralTools>>,
  "responseMessages" | "toUIMessageStream"
> & { readonly steps: PromiseLike<TutorStep[]> };

// Streams model calls with settings and the tools of reply's chat. Each tool
// that declares a context gets it: a project chat's update_memory gets the
// owner, the chat and its project. A central chat's tools declare none, so no
// tool learns of a project.
function streamTutorCalls(
  { owner, chat, toolDescriptions }: TutorToolsReply,
  settings: TutorCallSettings,
): TutorCalls {
  switch (chat.kind) {
    case "project":
      return streamText({
        ...settings,
        tools: projectTools(toolDescriptions),
        toolsContext: {
          [UPDATE_MEMORY_TOOL]: {
            owner,
            chatId: chat.id,
            projectId: chat.projectId,
          },
        },
      });
    case "central":
      return streamText({ ...settings, tools: centralTools(toolDescriptions) });
    default: {
      const unknownChat: never = chat;
      return unknownChat;
    }
  }
}

export type {
  TutorCallSettings,
  TutorCalls,
  TutorStep,
  TutorToolDescriptions,
  TutorTools,
  TutorToolsChat,
  TutorToolsPlace,
  TutorToolsReply,
};
export { streamTutorCalls, tutorTools };
