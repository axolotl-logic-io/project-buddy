// @vitest-environment node
import { streamText } from "ai";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_BUDDY_ID, getBuddy } from "@/buddies/index.ts";
import type { Chat } from "@/chats/chat-rows.ts";
import type { startProject } from "@/chats/start-chat.ts";
import {
  chatIdFixture,
  projectIdFixture,
  userIdFixture,
} from "@/id-fixtures.ts";
import { mockTutorModel } from "@/tutor/mock-model.ts";
import { createProjectTool } from "@/tutor/tools/create-project.ts";
import {
  CREATE_PROJECT_OUTPUT,
  CREATE_PROJECT_TOOL,
  type CreateProjectOutput,
} from "@/tutor/tools/create-project-contract.ts";
import type { CentralToolContext } from "@/tutor/tools/tutor-tool-context.ts";

const chats = vi.hoisted(() => ({
  startProject: vi.fn<typeof startProject>(),
}));
vi.mock("@/chats/start-chat.ts", () => chats);

const MR_TEE = getBuddy("mr-tee");
const CONTEXT: CentralToolContext = {
  owner: userIdFixture(),
  chatId: chatIdFixture(),
  buddy: { name: MR_TEE.name, parts: MR_TEE.parts },
};
const INTERVIEW_CHAT: Chat = {
  id: chatIdFixture(),
  projectId: projectIdFixture(),
  buddy: CONTEXT.buddy,
  createdAt: new Date("2026-10-17T09:00:00Z"),
  name: undefined,
  renamedByHand: false,
};
const RESETS_ON = new Date("2026-11-01T00:00:00Z");

// What the tool's call ended in, when the mock tutor calls it with name in
// a central chat with CONTEXT: its outputs, and the errors it failed with.
async function createProjectOutcomes(
  name: string,
): Promise<{ outputs: unknown[]; errors: unknown[] }> {
  const result = streamText({
    model: mockTutorModel(),
    messages: [
      {
        role: "user",
        content: `/mock-tool ${CREATE_PROJECT_TOOL} ${JSON.stringify({ name })}`,
      },
    ],
    tools: { [CREATE_PROJECT_TOOL]: createProjectTool },
    toolsContext: { [CREATE_PROJECT_TOOL]: CONTEXT },
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

// The tool's output for name.
async function callCreateProject(name: string): Promise<CreateProjectOutput> {
  const { outputs } = await createProjectOutcomes(name);
  return CREATE_PROJECT_OUTPUT.parse(outputs[0]);
}

describe("create_project", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("starts the project, trimmed, for the owner in the chat's buddy", async () => {
    chats.startProject.mockResolvedValue({
      kind: "started",
      chat: INTERVIEW_CHAT,
    });

    await expect(callCreateProject("  Low-poly fox  ")).resolves.toEqual({
      status: "created",
      projectId: INTERVIEW_CHAT.projectId,
      name: "Low-poly fox",
      interviewChatId: INTERVIEW_CHAT.id,
    });
    expect(chats.startProject).toHaveBeenCalledWith(
      CONTEXT.owner,
      "Low-poly fox",
      { id: DEFAULT_BUDDY_ID, ...CONTEXT.buddy },
    );
  });

  test("reports that Claude is unavailable", async () => {
    chats.startProject.mockResolvedValue({ kind: "claudeUnavailable" });

    await expect(callCreateProject("Low-poly fox")).resolves.toEqual({
      status: "claudeUnavailable",
    });
  });

  test("reports the quota used up, with its reset as an ISO time", async () => {
    chats.startProject.mockResolvedValue({
      kind: "quotaUsedUp",
      resetsOn: RESETS_ON,
    });

    await expect(callCreateProject("Low-poly fox")).resolves.toEqual({
      status: "quotaUsedUp",
      resetsOn: RESETS_ON.toISOString(),
    });
  });

  test("rejects a name of only spaces without starting a project", async () => {
    const { outputs, errors } = await createProjectOutcomes("   ");

    expect(outputs).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(chats.startProject).not.toHaveBeenCalled();
  });
});
