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
import type { MessageId, QuestId, UserId } from "@/ids.ts";
import { PROMPT_CACHE_BREAKPOINT } from "@/replies/prompt-cache.ts";
import { changePlanTool } from "@/replies/tools/change-plan.ts";
import { CHANGE_PLAN_TOOL } from "@/replies/tools/change-plan-contract.ts";
import { createQuestTool } from "@/replies/tools/create-quest.ts";
import { CREATE_QUEST_TOOL } from "@/replies/tools/create-quest-contract.ts";
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
  [CREATE_QUEST_TOOL]: typeof createQuestTool;
  [CHANGE_PLAN_TOOL]: typeof changePlanTool;
  [RECORD_MILESTONE_TOOL]: typeof recordMilestoneTool;
  [QUEST_STATUS_TOOL]: typeof questStatusTool;
}>;

type ChatToolName = keyof ChatTools;

// The chat a reply is in: its id, its quest, undefined in a standalone
// chat, and its construct, which a quest it starts takes.
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

// The tools a chat in a quest, or in none when questId is undefined, can
// call: every tool, but change_plan, record_milestone and
// request_quest_status only in a quest, and create_quest only in Chat,
// the one conversation that can be turned into a quest.
function activeChatTools(questId: QuestId | undefined): ChatToolName[] {
  const tools: ChatToolName[] = [CAST_SPELL_TOOL];
  if (questId === undefined) {
    tools.push(CREATE_QUEST_TOOL);
  } else {
    tools.push(CHANGE_PLAN_TOOL, RECORD_MILESTONE_TOOL, QUEST_STATUS_TOOL);
  }
  return tools;
}

// The cache breakpoint, on the last tool the chat can call.
function breakpointOn(
  tool: ChatToolName,
  active: readonly ChatToolName[],
): ToolSettings {
  if (active.at(-1) !== tool) {
    return {};
  }
  return { providerOptions: PROMPT_CACHE_BREAKPOINT };
}

// The tools for one request in a chat in a quest, or in none when
// questId is undefined, in the order the provider gets them. The last tool the chat can call ends the tools with a
// cache breakpoint, so they stay cached when a part in the system prompt
// after them changes.
function chatTools(questId: QuestId | undefined): ChatTools {
  const active = activeChatTools(questId);
  return {
    [CAST_SPELL_TOOL]: withSettings(
      castSpellTool,
      breakpointOn(CAST_SPELL_TOOL, active),
    ),
    [CREATE_QUEST_TOOL]: withSettings(
      createQuestTool,
      breakpointOn(CREATE_QUEST_TOOL, active),
    ),
    [CHANGE_PLAN_TOOL]: withSettings(
      changePlanTool,
      breakpointOn(CHANGE_PLAN_TOOL, active),
    ),
    [RECORD_MILESTONE_TOOL]: withSettings(
      recordMilestoneTool,
      breakpointOn(RECORD_MILESTONE_TOOL, active),
    ),
    [QUEST_STATUS_TOOL]: withSettings(
      questStatusTool,
      breakpointOn(QUEST_STATUS_TOOL, active),
    ),
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
// that declares a context gets the acting user, the chat, its quest, if any, and
// its construct.
function streamChatToolCalls(
  { actingUser, chat, answeredId }: ChatToolsReply,
  settings: ChatToolCallSettings,
): ChatToolCalls {
  const questId = chat.quest?.id;
  const context = {
    actingUser,
    chatId: chat.id,
    questId,
    construct: chat.construct,
    answeredId,
  };
  return streamText({
    ...settings,
    tools: chatTools(questId),
    activeTools: activeChatTools(questId),
    toolsContext: {
      [CAST_SPELL_TOOL]: context,
      [CHANGE_PLAN_TOOL]: context,
      [RECORD_MILESTONE_TOOL]: context,
      [QUEST_STATUS_TOOL]: context,
    },
  });
}

export type {
  ChatToolCallSettings,
  ChatToolCalls,
  ChatToolStep,
  ChatTools,
  ChatToolsChat,
  ChatToolsReply,
};
export { chatTools, streamChatToolCalls };
