// The tools available to a conversation and their per-reply context.
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
import type { Chat } from "@/chats/chat-rows.ts";
import type { MessageId, UserId } from "@/ids.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/replies/prompt-cache.ts";
import { changeTasksTool } from "@/replies/tools/change-tasks.ts";
import { CHANGE_TASKS_TOOL } from "@/replies/tools/change-tasks-contract.ts";
import { questStatusTool } from "@/replies/tools/quest-status.ts";
import { QUEST_STATUS_TOOL } from "@/replies/tools/quest-status-contract.ts";
import { recordMilestoneTool } from "@/replies/tools/record-milestone.ts";
import { RECORD_MILESTONE_TOOL } from "@/replies/tools/record-milestone-contract.ts";
import { castSpellTool } from "@/spells/cast-spell.ts";
import { CAST_SPELL_TOOL } from "@/spells/cast-spell-contract.ts";

// The tools in every chat. A type alias, not an interface, as the AI SDK's
// tool set must be a plain record.
type ChatTools = Readonly<{
  [CAST_SPELL_TOOL]: typeof castSpellTool;
  [CHANGE_TASKS_TOOL]: typeof changeTasksTool;
  [RECORD_MILESTONE_TOOL]: typeof recordMilestoneTool;
  [QUEST_STATUS_TOOL]: typeof questStatusTool;
}>;

// The chat a reply is in: its id, its quest and its construct.
type ChatToolsChat = Pick<Chat, "id" | "quest" | "construct">;

// What one request sets on a tool: its provider options, such as a cache
// breakpoint.
interface ToolSettings {
  readonly providerOptions?: SharedV4ProviderOptions;
}

// chatTool, a copy with settings, of the same type.
function withSettings<ChatTool extends Tool>(
  chatTool: ChatTool,
  settings: ToolSettings,
): ChatTool {
  return { ...chatTool, ...settings };
}

// The tools for one request, in the order the provider gets them. The last
// tool ends the tools with a cache breakpoint, so they stay cached when a
// part in the system prompt after them changes.
function chatTools(): ChatTools {
  return {
    [CAST_SPELL_TOOL]: castSpellTool,
    [CHANGE_TASKS_TOOL]: changeTasksTool,
    [RECORD_MILESTONE_TOOL]: recordMilestoneTool,
    [QUEST_STATUS_TOOL]: withSettings(questStatusTool, {
      providerOptions: PROMPT_CACHE_BREAKPOINT,
    }),
  };
}

// The reply that model calls are for: the acting user, their chat, and the user
// message it answers.
interface ChatToolsReply {
  readonly actingUser: UserId;
  readonly chat: ChatToolsChat;
  readonly answeredId: MessageId;
}

// The streamText settings that the model calls of a reply share.
interface ChatToolCallSettings {
  readonly abortSignal?: AbortSignal;
  readonly prepareStep?: () => Promise<undefined>;
  readonly onToolExecutionStart?: () => Promise<void>;
  readonly model: LanguageModelV4;
  readonly instructions: SystemModelMessage[];
  readonly messages: ModelMessage[];
  readonly stopWhen: ReturnType<typeof isStepCount>;
  readonly providerOptions: SharedV4ProviderOptions;
  readonly onError: (event: { error: unknown }) => void;
}

// One model call of a reply, as the reply reads it.
type ChatToolStep = Pick<
  StepResult<ChatTools>,
  "content" | "text" | "finishReason" | "rawFinishReason" | "usage"
>;

// What a reply reads from its model calls: its steps, the messages they add
// to the conversation, and the stream for the browser.
type ChatToolCalls = Pick<
  ReturnType<typeof streamText<ChatTools>>,
  "responseMessages" | "toUIMessageStream"
> & { readonly steps: PromiseLike<ChatToolStep[]> };

// Streams model calls with settings and the tools of reply's chat. Each tool
// that declares a context gets the acting user, the chat, its quest and its
// construct.
function streamChatToolCalls(
  { actingUser, chat, answeredId }: ChatToolsReply,
  settings: ChatToolCallSettings,
): ChatToolCalls {
  const context = {
    actingUser,
    chatId: chat.id,
    questId: chat.quest.id,
    construct: chat.construct,
    answeredId,
  };
  return streamText({
    ...settings,
    tools: chatTools(),
    toolsContext: {
      [CAST_SPELL_TOOL]: context,
      [CHANGE_TASKS_TOOL]: context,
      [RECORD_MILESTONE_TOOL]: context,
      [QUEST_STATUS_TOOL]: context,
    },
  });
}

export type { ChatToolCalls, ChatToolStep };
export { chatTools, streamChatToolCalls };
