import { tool } from "ai";
import { generateForChat } from "@/images/generate.ts";
import {
  GENERATE_IMAGE_DESCRIPTION,
  GENERATE_IMAGE_INPUT,
  GENERATE_IMAGE_OUTPUT,
  type GenerateImageInput,
  type GenerateImageOutput,
} from "@/images/generation-contract.ts";
import {
  claimGeneration,
  completeGeneration,
  failGeneration,
} from "@/images/generation-store.ts";
import { imageProvider } from "@/images/image-provider.ts";
import {
  CHAT_TOOL_CONTEXT,
  type ChatToolContext,
} from "@/replies/tools/chat-tool-context.ts";

async function generate(
  { prompt }: GenerateImageInput,
  { context }: { context: ChatToolContext },
): Promise<GenerateImageOutput> {
  return await generateForChat(
    {
      owner: context.owner,
      chatId: context.chatId,
      requestId: `${context.chatId}:${context.answeredId}`,
      prompt,
    },
    {
      provider: imageProvider(),
      claim: claimGeneration,
      complete: completeGeneration,
      fail: failGeneration,
    },
  );
}

const generateImageTool = tool({
  description: GENERATE_IMAGE_DESCRIPTION,
  inputSchema: GENERATE_IMAGE_INPUT,
  outputSchema: GENERATE_IMAGE_OUTPUT,
  contextSchema: CHAT_TOOL_CONTEXT,
  execute: generate,
});

export { generateImageTool };
