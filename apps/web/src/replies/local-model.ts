// MUD-inspired commands: explicit verbs, tool-backed actions and fixed replies.
// Sheets and tool outputs are data; they never supply executable commands.
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { isNeutralKickoff, OPENING_REQUEST } from "@/replies/chat-kickoff.ts";
import type { ScriptConversation, ScriptStep } from "@/replies/reply-script.ts";
import { scriptedModel } from "@/replies/scripted-model.ts";
import { visualDescriptionInPrompt } from "@/replies/visual-description.ts";
import {
  CAST_SPELL_OUTPUT,
  CAST_SPELL_TOOL,
} from "@/spells/cast-spell-contract.ts";
import { LOCAL_CONSTRUCT_COPY } from "@/ui/copy/local-construct.ts";

const COMMAND = /^\/?(?<verb>\S+)(?:\s+(?<argument>.*))?$/su;

function textStep(text: string): ScriptStep {
  return { text, toolCalls: [] };
}

function castSteps(
  name: string,
  { toolResults }: ScriptConversation,
): ScriptStep[] {
  const cast: ScriptStep = {
    text: "",
    toolCalls: [{ toolName: CAST_SPELL_TOOL, input: { name } }],
  };
  const [result] = toolResults;
  if (result === undefined) {
    return [cast];
  }
  const parsed = CAST_SPELL_OUTPUT.safeParse(result.output);
  if (result.failed || !parsed.success) {
    return [cast, textStep(LOCAL_CONSTRUCT_COPY.castFailed)];
  }
  if (parsed.data.status === "needsQuest") {
    return [cast, textStep(LOCAL_CONSTRUCT_COPY.needsQuest)];
  }
  if (parsed.data.status === "unavailable") {
    return [cast, textStep(LOCAL_CONSTRUCT_COPY.castFailed)];
  }
  return [cast, textStep(LOCAL_CONSTRUCT_COPY.cast(parsed.data.name))];
}

function localReply(
  userText: string,
  conversation: ScriptConversation,
): ScriptStep[] {
  if (userText === OPENING_REQUEST || isNeutralKickoff(userText)) {
    return [textStep(LOCAL_CONSTRUCT_COPY.welcome)];
  }
  const { verb = "", argument = "" } =
    COMMAND.exec(userText.trim())?.groups ?? {};
  switch (verb.toLowerCase()) {
    case "help":
      return [textStep(LOCAL_CONSTRUCT_COPY.help)];
    case "look": {
      const description = visualDescriptionInPrompt(
        conversation.systemTexts.join("\n\n"),
      );
      return [textStep(LOCAL_CONSTRUCT_COPY.look(description))];
    }
    case "cast":
      if (argument !== "") {
        return castSteps(argument, conversation);
      }
      return [textStep(LOCAL_CONSTRUCT_COPY.castUsage)];
    default:
      return [textStep(LOCAL_CONSTRUCT_COPY.unknownCommand)];
  }
}

function localConstructModel(prepared?: string): LanguageModelV4 {
  return scriptedModel(
    (text, conversation) => {
      if (prepared !== undefined) {
        return [textStep(prepared)];
      }
      return localReply(text, conversation);
    },
    {
      provider: "local",
      modelId: "construct-commands",
      usage: {
        inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 0, text: 0, reasoning: undefined },
      },
    },
  );
}

export { localConstructModel };
