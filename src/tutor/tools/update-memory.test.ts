// @vitest-environment node
import { streamText } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AppError } from "@/errors/app-error.ts";
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

// What the tool's call ended in, when the mock tutor calls it with EDIT in a
// chat with CONTEXT: its output, or the error it failed with.
async function updateMemoryOutcomes(): Promise<{
  outputs: unknown[];
  errors: unknown[];
}> {
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
  const [step] = await result.steps;
  const outputs: unknown[] = [];
  const errors: unknown[] = [];
  for (const part of step?.content ?? []) {
    if (part.type === "tool-result") {
      outputs.push(part.output);
    }
    if (part.type === "tool-error") {
      errors.push(part.error);
    }
  }
  return { outputs, errors };
}

// The tool's output.
async function callUpdateMemory(): Promise<UpdateMemoryOutput> {
  const { outputs } = await updateMemoryOutcomes();
  return UPDATE_MEMORY_OUTPUT.parse(outputs[0]);
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

  test("fails as not found when the chat's project is not the owner's", async () => {
    memoryStore.editMemory.mockResolvedValue(undefined);

    const {
      errors: [error],
    } = await updateMemoryOutcomes();

    expect(error).toBeInstanceOf(AppError);
    expect(error).toHaveProperty("errorCase", "not-found");
  });
});
