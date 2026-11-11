// For the server tests of team projects: a project whose owner has saved one
// of each kind of data reached through it, with a member added through the
// members store, and two probes over the stores: everything a user can read
// of the project, and every write a user can try on it.

import type { User } from "@/accounts/users-store.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import {
  currentActivity,
  enterActivity,
} from "@/activities/activity-sessions.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import type { ProjectChat } from "@/chats/chat-rows.ts";
import { getChat, listMessages, saveMessage } from "@/chats/store.ts";
import {
  readQuestConversation,
  startQuestConversation,
} from "@/conversations/start-quest.ts";
import type { MilestoneId } from "@/ids.ts";
import type { GenerationId } from "@/images/generation-contract.ts";
import {
  claimGeneration,
  completeGeneration,
  getGeneratedImage,
} from "@/images/generation-store.ts";
import { imageId } from "@/images/image-contract.ts";
import { getImage, saveImage } from "@/images/store.ts";
import { EMPTY_MEMORY, MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import {
  readMemory,
  readMemoryHistory,
  saveMemory,
} from "@/memory/memory-store.ts";
import {
  deleteMilestone,
  editMilestone,
  listMilestones,
  recordMilestone,
} from "@/milestones/milestone-store.ts";
import {
  addProjectMember,
  listProjectMembers,
} from "@/projects/members-store.ts";
import { getProject, listProjects, type Project } from "@/projects/store.ts";
import { readHomeSummary } from "@/today/today-store.ts";
import { pngBytes } from "../../support/images/image-fixtures.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { newMessageId, question } from "../test-database/chat-test-kit.ts";

const MEMORY = "Goal: a sea turtle model.";
const MILESTONE = "Modelled the shell";
const PNG = pngBytes();

// A team project, its owner and a member, with one of each kind of data the
// owner saved in it.
interface TeamProject {
  readonly owner: User;
  readonly member: User;
  readonly project: Project;
  readonly chat: ProjectChat;
  // The id of an image in the chat.
  readonly imageId: string;
  readonly generationId: GenerationId;
  readonly milestoneId: MilestoneId;
}

// The image id the url names, which saveImage returned.
function savedImageId(url: string | undefined): string {
  const id = imageId(url ?? "");
  if (id === undefined) {
    throw new Error("The image was not saved");
  }
  return id;
}

// The owner's generated image in the chat, claimed and completed.
async function generatedImage(
  owner: User,
  chat: ProjectChat,
): Promise<GenerationId> {
  const claim = await claimGeneration({
    owner: owner.id,
    chatId: chat.id,
    requestId: crypto.randomUUID(),
    prompt: "A sea turtle",
  });
  if (claim.status !== "claimed") {
    throw new Error(`The generation was not claimed: ${claim.status}`);
  }
  const completed = await completeGeneration(owner.id, claim.id, {
    bytes: PNG,
    mediaType: "image/png",
    costMicroUsd: 1000,
  });
  if (!completed) {
    throw new Error("The generation was not completed");
  }
  return claim.id;
}

// A new project of a new owner's, with a chat holding a message and an
// image, an interview activity session, a memory with a note, a milestone
// and a generated image; and a new user added as its member.
async function teamProject(): Promise<TeamProject> {
  const [owner, member] = await Promise.all([testUser(), testUser()]);
  const data = testData(owner);
  const project = await data.project();
  const chat = await data.chat(project);
  await data.interviewChat(chat);
  await data.exchanges(chat, [
    { message: "Hello", reply: [{ type: "text", text: "Hi" }] },
  ]);
  const image = savedImageId(
    await saveImage(owner.id, chat.id, PNG, "image/png"),
  );
  await saveMemory(owner.id, {
    projectId: project.id,
    text: MEMORY,
    basedOn: MEMORY_VERSION_NUMBER.parse(0),
    author: "user",
  });
  await saveMemory(owner.id, {
    projectId: project.id,
    text: `${MEMORY}\n\nNote (2026-11-02): Bevel the shell`,
    basedOn: MEMORY_VERSION_NUMBER.parse(1),
    author: "user",
  });
  const milestone = await recordMilestone(
    owner.id,
    { projectId: project.id, chatId: chat.id },
    MILESTONE,
  );
  if (milestone === undefined) {
    throw new Error("The milestone was not recorded");
  }
  const generationId = await generatedImage(owner, chat);
  if (!(await addProjectMember(member.id, project.id))) {
    throw new Error("The member was not added");
  }
  return {
    owner,
    member,
    project,
    chat,
    imageId: image,
    generationId,
    milestoneId: milestone.id,
  };
}

// Everything user can read of the team project, through each store that
// reads project data.
async function seenBy(
  user: User,
  team: TeamProject,
): Promise<Record<string, unknown>> {
  const { project, chat } = team;
  const [
    found,
    listed,
    conversation,
    openedChat,
    today,
    messages,
    image,
    generation,
    activity,
    memory,
    history,
    milestones,
    members,
  ] = await Promise.all([
    getProject(user.id, project.id),
    listProjects(user.id),
    readQuestConversation(user.id, project.id),
    getChat(user.id, chat.id),
    readHomeSummary(user.id),
    listMessages(user.id, chat.id),
    getImage(user.id, team.imageId),
    getGeneratedImage(user.id, team.generationId),
    currentActivity(user.id, chat),
    readMemory(user.id, project.id),
    readMemoryHistory(user.id, project.id),
    listMilestones(user.id, project.id),
    listProjectMembers(user.id, project.id),
  ]);
  return {
    project: found?.name,
    listed: listed.some(({ id }) => id === project.id),
    conversation: conversation?.id,
    chat: openedChat?.id,
    today: today.latestQuest?.project.id === project.id,
    messages: messages.length,
    image: image?.mediaType,
    generation: generation?.id,
    activity: activity.id,
    memory: memory.text,
    history: history.length,
    milestones: milestones.map(({ text }) => text),
    members: members.map(({ id }) => id),
  };
}

// What someone who isn't in the project reads of it: nothing, exactly as
// of a project that doesn't exist.
const NOTHING: Record<string, unknown> = {
  project: undefined,
  listed: false,
  conversation: undefined,
  chat: undefined,
  today: false,
  messages: 0,
  image: undefined,
  generation: undefined,
  activity: DEFAULT_ACTIVITY_ID,
  memory: EMPTY_MEMORY.text,
  history: 0,
  milestones: [],
  members: [],
};

// Tries every write a member may make in the team project, as user, and
// says what each answered: whether it took effect.
async function writesBy(
  user: User,
  team: TeamProject,
): Promise<Record<string, unknown>> {
  const { project, chat } = team;
  const memory = await readMemory(team.owner.id, project.id);
  const message = await saveMessage(user.id, chat.id, {
    ...question("Mine"),
    id: newMessageId(),
  });
  const image = await saveImage(user.id, chat.id, PNG, "image/png");
  const activity = await enterActivity(
    user.id,
    chat.id,
    builtInActivity(DEFAULT_ACTIVITY_ID),
    undefined,
  );
  const memorySave = await saveMemory(user.id, {
    projectId: project.id,
    text: `${memory.text}\n\nMore.`,
    basedOn: memory.version,
    author: "user",
  });
  const milestone = await recordMilestone(
    user.id,
    { projectId: project.id, chatId: chat.id },
    "Rigged the flippers",
  );
  const edited = await editMilestone(user.id, team.milestoneId, "Edited");
  const started = await startQuestConversation(user.id, project.id);
  const conversation =
    started.kind === "started" && started.conversation.id === chat.id;
  const generation = await claimGeneration({
    owner: user.id,
    chatId: chat.id,
    requestId: crypto.randomUUID(),
    prompt: "A turtle",
  });
  return {
    message,
    image: image !== undefined,
    activity,
    memory: memorySave.kind,
    milestone: milestone !== undefined,
    edited,
    conversation,
    generation: generation.status,
  };
}

// What every write answers for someone who isn't in the project: nothing
// taken.
const NONE_TAKEN: Record<string, unknown> = {
  message: "id-taken",
  image: false,
  activity: false,
  memory: "outdated",
  milestone: false,
  edited: false,
  conversation: false,
  generation: "failed",
};

// What every write answers for someone in the project: each one taken.
const ALL_TAKEN: Record<string, unknown> = {
  message: "inserted",
  image: true,
  activity: true,
  memory: "saved",
  milestone: true,
  edited: true,
  conversation: true,
  generation: "claimed",
};

// Deletes the milestone as the acting user.
async function deletesBy(user: User, team: TeamProject): Promise<void> {
  await deleteMilestone(user.id, team.milestoneId);
}

export type { TeamProject };
export {
  ALL_TAKEN,
  deletesBy,
  NONE_TAKEN,
  NOTHING,
  seenBy,
  teamProject,
  writesBy,
};
