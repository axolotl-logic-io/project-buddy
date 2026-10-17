// What the create_project tool takes and returns, shared by the tool and the
// part that shows the new project in the chat. It imports nothing from the
// server, because the part in the browser imports it too.
import { z } from "zod";
import { CHAT_ID, PROJECT_ID } from "@/ids.ts";
import { PROJECT_NAME } from "@/projects/project-name.ts";

const CREATE_PROJECT_TOOL = "create_project";

// The createProjectTool part's default: the tool's description.
const CREATE_PROJECT_DESCRIPTION = [
  "Create a new project for the user, named as given, in this chat's buddy.",
  "Call it only when the user asks for a new project, or asks to make the idea you talked through a project.",
  "The app writes the project's first message, which starts its interview, and the user sees a link to that chat here.",
  "If the result says Claude is unavailable or the user's quota is used up, no project was created: tell the user so.",
].join(" ");

const CREATE_PROJECT_INPUT = z.object({
  name: PROJECT_NAME.describe(
    "The project's name, short and as the user would call it.",
  ),
});

// The project the tool created, with its interview chat, or why it created
// nothing: Claude could not write the interview's opening, or the user's
// quota is used up until resetsOn.
const CREATE_PROJECT_OUTPUT = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("created"),
    projectId: PROJECT_ID,
    name: z.string(),
    interviewChatId: CHAT_ID,
  }),
  z.object({ status: z.literal("claudeUnavailable") }),
  z.object({ status: z.literal("quotaUsedUp"), resetsOn: z.iso.datetime() }),
]);

type CreateProjectInput = z.infer<typeof CREATE_PROJECT_INPUT>;
type CreateProjectOutput = z.infer<typeof CREATE_PROJECT_OUTPUT>;

export type { CreateProjectInput, CreateProjectOutput };
export {
  CREATE_PROJECT_DESCRIPTION,
  CREATE_PROJECT_INPUT,
  CREATE_PROJECT_OUTPUT,
  CREATE_PROJECT_TOOL,
};
