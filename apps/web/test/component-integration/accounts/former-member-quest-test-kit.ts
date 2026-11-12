// Current-schema fixture for owner isolation after shared quest storage is gone.
// The real historical membership/invitation transition is exercised in
// db/retired-storage-migration.server.test.ts. Here the former member has
// no membership rows, as after cleanup, and every store must still deny them.

import type { User } from "@/accounts/users-store.ts";
import { DEFAULT_ACTIVITY_ID } from "@/activities/activity.ts";
import {
  currentActivity,
  enterActivity,
} from "@/activities/activity-sessions.ts";
import { builtInActivity } from "@/activities/chosen-activity.ts";
import type { QuestChat } from "@/chats/chat-rows.ts";
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
import {
  deleteMilestone,
  editMilestone,
  listMilestones,
  recordMilestone,
} from "@/milestones/milestone-store.ts";
import { getQuest, listQuests, type Quest } from "@/quests/store.ts";
import { pngBytes } from "../../support/images/image-fixtures.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { newMessageId, question } from "../test-database/chat-test-kit.ts";

// A second Journal version with historical text.
const MILESTONE = "Modelled the shell";
const PNG = pngBytes();

// A quest, its owner and a former member, with one of each kind of data the
// owner saved in it.
interface FormerMemberQuest {
  readonly owner: User;
  readonly member: User;
  readonly quest: Quest;
  readonly chat: QuestChat;
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
  chat: QuestChat,
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

// A new quest of a new owner's, with a chat holding a message and an image,
// an interview activity session, a memory of two versions, a milestone and a
// generated image; and a second user with no access to it.
async function formerMemberQuest(): Promise<FormerMemberQuest> {
  const [owner, member] = await Promise.all([testUser(), testUser()]);
  const data = testData(owner);
  const quest = await data.quest();
  const chat = await data.chat(quest);
  await data.interviewChat(chat);
  await data.exchanges(chat, [
    { message: "Hello", reply: [{ type: "text", text: "Hi" }] },
  ]);
  const image = savedImageId(
    await saveImage(owner.id, chat.id, PNG, "image/png"),
  );
  const milestone = await recordMilestone(
    owner.id,
    { questId: quest.id, chatId: chat.id },
    MILESTONE,
  );
  if (milestone === undefined) {
    throw new Error("The milestone was not recorded");
  }
  const generationId = await generatedImage(owner, chat);
  return {
    owner,
    member,
    quest,
    chat,
    imageId: image,
    generationId,
    milestoneId: milestone.id,
  };
}

// Everything user can read of the quest, through each store that
// reads quest data.
async function seenBy(
  user: User,
  fixture: FormerMemberQuest,
): Promise<Record<string, unknown>> {
  const { quest, chat } = fixture;
  const [
    found,
    listed,
    conversation,
    openedChat,
    messages,
    image,
    generation,
    activity,

    milestones,
  ] = await Promise.all([
    getQuest(user.id, quest.id),
    listQuests(user.id),
    readQuestConversation(user.id, quest.id),
    getChat(user.id, chat.id),
    listMessages(user.id, chat.id),
    getImage(user.id, fixture.imageId),
    getGeneratedImage(user.id, fixture.generationId),
    currentActivity(user.id, chat),

    listMilestones(user.id, quest.id),
  ]);
  return {
    quest: found?.name,
    listed: listed.some(({ id }) => id === quest.id),
    conversation: conversation?.id,
    chat: openedChat?.id,
    messages: messages.length,
    image: image?.mediaType,
    generation: generation?.id,
    activity: activity.id,

    milestones: milestones.map(({ text }) => text),
  };
}

// What someone other than the owner reads of the quest: nothing, exactly
// as of a quest that doesn't exist.
const NOTHING: Record<string, unknown> = {
  quest: undefined,
  listed: false,
  conversation: undefined,
  chat: undefined,
  messages: 0,
  image: undefined,
  generation: undefined,
  activity: DEFAULT_ACTIVITY_ID,

  milestones: [],
};

// Tries every write the owner may make in the quest, as user, and says what
// each answered: whether it took effect.
async function writesBy(
  user: User,
  fixture: FormerMemberQuest,
): Promise<Record<string, unknown>> {
  const { quest, chat } = fixture;
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
  const milestone = await recordMilestone(
    user.id,
    { questId: quest.id, chatId: chat.id },
    "Rigged the flippers",
  );
  const edited = await editMilestone(user.id, fixture.milestoneId, "Edited");
  const started = await startQuestConversation(user.id, quest.id);
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

    milestone: milestone !== undefined,
    edited,
    conversation,
    generation: generation.status,
  };
}

// What every write answers for someone other than the owner: nothing
// taken.
const NONE_TAKEN: Record<string, unknown> = {
  message: "id-taken",
  image: false,
  activity: false,

  milestone: false,
  edited: false,
  conversation: false,
  generation: "failed",
};

// What every write answers for the owner: each one taken.
const ALL_TAKEN: Record<string, unknown> = {
  message: "inserted",
  image: true,
  activity: true,

  milestone: true,
  edited: true,
  conversation: true,
  generation: "claimed",
};

// Deletes the milestone as user, which answers nothing of its own.
async function deletesBy(
  user: User,
  fixture: FormerMemberQuest,
): Promise<void> {
  await deleteMilestone(user.id, fixture.milestoneId);
}

export type { FormerMemberQuest };
export {
  ALL_TAKEN,
  deletesBy,
  formerMemberQuest,
  NONE_TAKEN,
  NOTHING,
  seenBy,
  writesBy,
};
