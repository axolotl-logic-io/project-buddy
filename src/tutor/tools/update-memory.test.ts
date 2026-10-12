// @vitest-environment node
import { streamText } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  chatIdFixture,
  projectIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import type { editMemory } from "@/memory/memory-store.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import type { TutorToolContext } from "@/tutor/tools/tutor-tool-context.ts";
import { updateMemoryTool } from "@/tutor/tools/update-memory.ts";
import {
  UPDATE_MEMORY_OUTPUT,
  UPDATE_MEMORY_TOOL,
  type UpdateMemoryOutput,
} from "@/tutor/tools/update-memory-contract.ts";

const memoryStore = vi.hoisted(() => ({
  editMemory: vi.fn<typeof editMemory>(),
}));
vi.mock("@/memory/memory-store.ts", () => memoryStore);

const CONTEXT: TutorToolContext = {
  owner: userIdFixture(),
  chatId: chatIdFixture(),
  projectId: projectIdFixture(),
};
const EDIT = { oldText: "- Rig it", newText: "- Rig it (done)" };
const FOURTH = 4;
const SAVED_VERSION = MEMORY_VERSION_NUMBER.parse(FOURTH);

// The tool's output when the mock tutor calls it with EDIT in a chat with
// CONTEXT.
async function callUpdateMemory(): Promise<UpdateMemoryOutput> {
  const result = streamText({
    model: mockTutorModel(),
    messages: [
      {
        role: "user",
        content: `/mock-tool ${UPDATE_MEMORY_TOOL} ${JSON.stringify(EDIT)}`,
      },
    ],
    tools: { [UPDATE_MEMORY_TOOL]: updateMemoryTool },
    toolsContext: { [UPDATE_MEMORY_TOOL]: CONTEXT },
  });
  const [toolResult] = await result.toolResults;
  return UPDATE_MEMORY_OUTPUT.parse(toolResult?.output);
}

describe("update_memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("edits its chat's project memory as the tutor and returns the change", async () => {
    memoryStore.editMemory.mockResolvedValue({
      kind: "saved",
      memory: { text: "- Rig it (done)", version: SAVED_VERSION },
    });

    await expect(callUpdateMemory()).resolves.toEqual({
      status: "updated",
      version: SAVED_VERSION,
      ...EDIT,
    });
    expect(memoryStore.editMemory).toHaveBeenCalledWith(CONTEXT.owner, {
      projectId: CONTEXT.projectId,
      edit: EDIT,
      author: "tutor",
    });
  });

  test("reports an edit that did not apply, with the memory as it is", async () => {
    memoryStore.editMemory.mockResolvedValue({
      kind: "failed",
      reason: "missing",
      memory: { text: "Her rewrite", version: SAVED_VERSION },
    });

    await expect(callUpdateMemory()).resolves.toEqual({
      status: "not-applied",
      reason: "missing",
      memory: "Her rewrite",
    });
  });
});
