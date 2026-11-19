// Fills the review accounts (review-accounts.ts) for `mise run review-data
// [EMAIL]`: an empty account, a typical one and a crowded one
// (review-content.ts), in this worktree's local development database, then
// prints a sign-in link for each. Every run deletes the three accounts and
// makes them again, so they always hold the same data.
//
// Quests are started, and messages sent to the construct, through the
// running local site's API, so the construct's replies are the local
// engine's own, saved as the browser would see them. Everything else is made
// in this process with the site's own stores, as its pages and commands
// make it. Two things go straight into the database, because the local
// construct engine never makes them: the construct replies that record a
// milestone (with the milestone itself) and the replies written in Markdown.
//
// Runs after npm ci, from run.ts.
import process from "node:process";
import type { UIMessage } from "ai";
import { z } from "zod";
import type { SessionUser } from "@/auth/session-token.ts";
import {
  closeAppDatabase,
  loopbackOrigin,
  pointAtLocalDatabase,
  type ReviewAccount,
  type ReviewKind,
  reviewAccounts,
} from "./review-accounts.ts";
import {
  CROWDED,
  type QuestStep,
  type ReviewContent,
  type ReviewQuest,
  TYPICAL,
} from "./review-content.ts";
import { createSessionToken } from "./session-token.ts";
import { createSignInLink } from "./sign-in-link.ts";

const DEFAULT_SITE = "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 30_000;
const IDEA_COMMAND = /^\/idea\s+/u;

// The parts of the API's answers this script reads.
const ME = z.object({ email: z.string() });
const QUEST = z.object({ id: z.string(), revision: z.number() });
const STARTED = z.object({ id: z.string(), conversationId: z.string() });

// The running site and the account's session cookie for it.
interface Site {
  readonly origin: string;
  readonly session: string;
}

// A quest being filled: its owner, its id and its conversation's id.
interface Scene {
  readonly owner: string;
  readonly questId: string;
  readonly chatId: string;
}

// The local site's origin from PROJECT_BUDDY_URL, or localhost:3000. Refuses
// any other host: the session cookies this script signs would work on a
// hosted site sharing the secret, and nothing here is for one.
function localSiteOrigin(): string {
  const { PROJECT_BUDDY_URL = DEFAULT_SITE } = process.env;
  const origin = loopbackOrigin(PROJECT_BUDDY_URL);
  if (origin === undefined) {
    throw new Error(
      `PROJECT_BUDDY_URL must be the local site, such as ${DEFAULT_SITE}.`,
    );
  }
  return origin;
}

// The data of a JSON answer from the site's API at path, as the account.
// Throws, with the API's message, unless it succeeded.
async function callApi(
  site: Site,
  path: string,
  request?: {
    readonly method: "POST" | "PUT" | "DELETE";
    readonly body?: unknown;
  },
): Promise<unknown> {
  const method = request?.method ?? "GET";
  let payload: string | null = null;
  if (request?.body !== undefined) {
    payload = JSON.stringify(request.body);
  }
  const response = await fetch(new URL(`/api/v1${path}`, site.origin), {
    method,
    headers: {
      cookie: `session=${site.session}`,
      "content-type": "application/json",
    },
    body: payload,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const requestStatus = `${response.status} to ${method} ${path}`;
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => ({}));
    throw new Error(
      `The site answered ${requestStatus}: ${JSON.stringify(error)}`,
    );
  }
  const answer: unknown = await response.json().catch(() => ({}));
  const envelope = z.object({ data: z.unknown() }).safeParse(answer);
  if (!envelope.success) {
    throw new Error(
      `The site answered ${requestStatus} without a JSON data object.`,
    );
  }
  return envelope.data.data;
}

// Deletes the account, and with it everything it made, then invites it again
// and completes its sign-up with its name. The stores have no account
// deletion, so the row is deleted directly; its quests, spells and the rest
// go with it by foreign key.
async function remakeAccount(account: ReviewAccount): Promise<SessionUser> {
  const [
    { inTransaction },
    { users },
    { eq },
    { completeSignUpIn, findOrInviteAccount },
  ] = await Promise.all([
    import("@/db/client.ts"),
    import("@/db/tables/users.ts"),
    import("drizzle-orm"),
    import("@/accounts/users-store.ts"),
  ]);
  return inTransaction(async (db) => {
    await db.delete(users).where(eq(users.email, account.email));
    const id = await findOrInviteAccount(db, account.email);
    const user = await completeSignUpIn(db, id, account.name);
    if (user === undefined) {
      throw new Error(`${account.email} could not complete sign-up.`);
    }
    return user;
  });
}

// Proves the site is this worktree's: it answers the session this script
// signed for the account with the account itself.
async function checkSite(site: Site, account: ReviewAccount): Promise<void> {
  const me = await callApi(site, "/me")
    .then((data) => ME.safeParse(data).data)
    .catch((cause: unknown) => {
      throw new Error(
        `Start this worktree's site first (mise //apps/web:dev), at ${site.origin}.`,
        { cause },
      );
    });
  if (me?.email !== account.email) {
    throw new Error(
      `The site at ${site.origin} doesn't use this worktree's database. Start this worktree's site.`,
    );
  }
}

// A new message id, as the AI SDK makes one.
async function newMessageId(): Promise<string> {
  const { generateId } = await import("ai");
  return generateId();
}

// Saves a message the person sends and the construct's reply to it, with
// the reply's parts, as the reply's stream saves them.
async function saveExchange(
  scene: Scene,
  message: string,
  parts: UIMessage["parts"],
): Promise<void> {
  const [{ saveMessage, saveReply }, { CHAT_ID, MESSAGE_ID, USER_ID }] =
    await Promise.all([import("@/chats/store.ts"), import("@/ids.ts")]);
  const owner = USER_ID.parse(scene.owner);
  const chatId = CHAT_ID.parse(scene.chatId);
  const messageId = MESSAGE_ID.parse(await newMessageId());
  await saveMessage(owner, chatId, {
    id: messageId,
    role: "user",
    parts: [{ type: "text", text: message }],
  });
  await saveReply(
    owner,
    chatId,
    {
      id: MESSAGE_ID.parse(await newMessageId()),
      role: "assistant",
      parts,
    },
    messageId,
  );
}

// Saves a message the person adds to the conversation without the
// construct, such as a tasks change, as the site's commands save one.
async function saveTasksMessage(
  scene: Scene,
  message: UIMessage,
): Promise<void> {
  const [store, { CHAT_ID, USER_ID }] = await Promise.all([
    import("@/chats/store.ts"),
    import("@/ids.ts"),
  ]);
  await store.saveTasksMessage(
    USER_ID.parse(scene.owner),
    CHAT_ID.parse(scene.chatId),
    message,
  );
}

// Runs a tasks command, such as /add or /done, as the chat's command action
// does (src/tasks/tasks-actions.ts), which only a Server Action may call.
async function tasksCommand(scene: Scene, text: string): Promise<void> {
  const [
    { parseTasksCommand },
    { changeTasks, readTasksState },
    { tasksCardMessage, tasksChangeMessage },
    { CHAT_ID, QUEST_ID, USER_ID },
  ] = await Promise.all([
    import("@/tasks/tasks-commands.ts"),
    import("@/tasks/tasks-store.ts"),
    import("@/tasks/tasks-message.ts"),
    import("@/ids.ts"),
  ]);
  const owner = USER_ID.parse(scene.owner);
  const questId = QUEST_ID.parse(scene.questId);
  const state = await readTasksState(owner, questId);
  if (state === undefined) {
    throw new Error(`No tasks for ${text}`);
  }
  const command = parseTasksCommand(text, state.tasks);
  if (command.kind === "show") {
    await saveTasksMessage(
      scene,
      tasksCardMessage(await newMessageId(), { command: text }),
    );
    return;
  }
  if (command.kind !== "change") {
    throw new Error(`"${text}" isn't a tasks change.`);
  }
  const outcome = await changeTasks(
    owner,
    { questId, chatId: CHAT_ID.parse(scene.chatId), author: "person" },
    command.operations,
  );
  if (outcome?.kind !== "changed") {
    throw new Error(`"${text}" changed nothing.`);
  }
  const { version, lines } = outcome.change;
  await saveTasksMessage(
    scene,
    tasksChangeMessage(await newMessageId(), {
      version,
      lines: [...lines],
      command: text,
    }),
  );
}

// Tasks added from the Tasks panel, in one change with no command.
async function addTasks(scene: Scene, texts: readonly string[]): Promise<void> {
  const [
    { changeTasks },
    { tasksChangeMessage },
    { CHAT_ID, QUEST_ID, USER_ID },
  ] = await Promise.all([
    import("@/tasks/tasks-store.ts"),
    import("@/tasks/tasks-message.ts"),
    import("@/ids.ts"),
  ]);
  const outcome = await changeTasks(
    USER_ID.parse(scene.owner),
    {
      questId: QUEST_ID.parse(scene.questId),
      chatId: CHAT_ID.parse(scene.chatId),
      author: "person",
    },
    texts.map((text) => ({ op: "add", text })),
  );
  if (outcome?.kind !== "changed") {
    throw new Error("The tasks were not added.");
  }
  const { version, lines } = outcome.change;
  await saveTasksMessage(
    scene,
    tasksChangeMessage(await newMessageId(), { version, lines: [...lines] }),
  );
}

// Runs /idea TEXT as the chat's panel command does
// (src/commands/run-panel-command.ts), which only a Server Action may call.
async function ideaCommand(scene: Scene, text: string): Promise<void> {
  const [
    { changeIdea },
    { commandNoteMessage },
    { PANEL_COMMANDS_COPY },
    { QUEST_ID, USER_ID },
  ] = await Promise.all([
    import("@/ideas/idea-store.ts"),
    import("@/tasks/tasks-message.ts"),
    import("@/ui/copy/commands.ts"),
    import("@/ids.ts"),
  ]);
  const idea = text.replace(IDEA_COMMAND, "");
  const result = await changeIdea(USER_ID.parse(scene.owner), {
    op: "add",
    questId: QUEST_ID.parse(scene.questId),
    text: idea,
  });
  if (result.kind !== "saved") {
    throw new Error(`The idea was not saved: ${result.text}`);
  }
  await saveTasksMessage(
    scene,
    commandNoteMessage(await newMessageId(), {
      command: text,
      note: PANEL_COMMANDS_COPY.notes.idea(idea),
    }),
  );
}

// A Quick Note, as the Quick Note box saves one.
async function addNote(scene: Scene, text: string): Promise<void> {
  const [{ saveNote }, { QUEST_ID, USER_ID }] = await Promise.all([
    import("@/notes/note-store.ts"),
    import("@/ids.ts"),
  ]);
  const saved = await saveNote(USER_ID.parse(scene.owner), {
    questId: QUEST_ID.parse(scene.questId),
    text,
  });
  if (!saved) {
    throw new Error("The Quick Note was not saved.");
  }
}

// A milestone on the quest's progress timeline, recorded as the
// record_milestone tool records one; with a message, the construct's reply
// that recorded it, with its card.
async function addMilestone(
  scene: Scene,
  text: string,
  exchange?: { readonly message: string; readonly reply: string },
): Promise<void> {
  const [
    { recordMilestone },
    { RECORD_MILESTONE_TOOL },
    { CHAT_ID, QUEST_ID, USER_ID },
  ] = await Promise.all([
    import("@/milestones/milestone-store.ts"),
    import("@/replies/tools/record-milestone-contract.ts"),
    import("@/ids.ts"),
  ]);
  const milestone = await recordMilestone(
    USER_ID.parse(scene.owner),
    {
      questId: QUEST_ID.parse(scene.questId),
      chatId: CHAT_ID.parse(scene.chatId),
    },
    text,
  );
  if (milestone === undefined) {
    throw new Error("The milestone was not recorded.");
  }
  if (exchange === undefined) {
    return;
  }
  await saveExchange(scene, exchange.message, [
    {
      type: `tool-${RECORD_MILESTONE_TOOL}`,
      toolCallId: `review-${milestone.id}`,
      state: "output-available",
      input: { text },
      output: {
        status: "recorded",
        milestoneId: milestone.id,
        questId: scene.questId,
        text,
        recordedAt: milestone.recordedAt.toISOString(),
      },
    },
    { type: "text", text: exchange.reply },
  ]);
}

// Completes or abandons the quest as its status control does, with the
// command note the /complete and /abandon commands save.
async function changeStatus(
  site: Site,
  scene: Scene,
  status: "completed" | "abandoned",
): Promise<void> {
  const [{ commandNoteMessage }, { PANEL_COMMANDS_COPY }] = await Promise.all([
    import("@/tasks/tasks-message.ts"),
    import("@/ui/copy/commands.ts"),
  ]);
  const quest = QUEST.parse(await callApi(site, `/quests/${scene.questId}`));
  await callApi(site, `/quests/${scene.questId}/status`, {
    method: "POST",
    body: { status, revision: quest.revision },
  });
  let command = "/complete";
  if (status === "abandoned") {
    command = "/abandon";
  }
  await saveTasksMessage(
    scene,
    commandNoteMessage(await newMessageId(), {
      command,
      note: PANEL_COMMANDS_COPY.notes.status[status],
    }),
  );
}

// Calls act on each item, one after another, each once the one before has
// finished: the conversation keeps their order.
async function inOrder<T>(
  items: readonly T[],
  act: (item: T) => Promise<unknown>,
): Promise<void> {
  const [item, ...rest] = items;
  if (item === undefined) {
    return;
  }
  await act(item);
  await inOrder(rest, act);
}

async function castSpell(
  site: Site,
  scene: Scene,
  name: string,
): Promise<void> {
  const [{ resolveSpellName }, { USER_ID }] = await Promise.all([
    import("@/spells/own-spell-store.ts"),
    import("@/ids.ts"),
  ]);
  const resolved = await resolveSpellName(USER_ID.parse(scene.owner), name);
  if (resolved.kind !== "found") {
    throw new Error(`The review spell "${name}" could not be found by name.`);
  }
  await callApi(site, `/quests/${scene.questId}/conversation/spell`, {
    method: "PUT",
    body: { spell: resolved.spell.id },
  });
}

// Does one step in the quest.
async function runStep(
  site: Site,
  scene: Scene,
  step: QuestStep,
): Promise<void> {
  switch (step.kind) {
    case "cast":
      await castSpell(site, scene, step.name);
      return;
    case "stop":
      await callApi(site, `/quests/${scene.questId}/conversation/spell`, {
        method: "DELETE",
      });
      return;
    case "send":
      await callApi(site, `/quests/${scene.questId}/conversation/messages`, {
        method: "POST",
        body: { text: step.text },
      });
      return;
    case "command":
      if (step.text.startsWith("/idea ")) {
        await ideaCommand(scene, step.text);
        return;
      }
      await tasksCommand(scene, step.text);
      return;
    case "tasks":
      await addTasks(scene, step.texts);
      return;
    case "note":
      await addNote(scene, step.text);
      return;
    case "milestone":
      await addMilestone(scene, step.text);
      return;
    case "milestone-reply":
      await addMilestone(scene, step.milestone, step);
      return;
    case "reply":
      await saveExchange(scene, step.message, [
        { type: "text", text: step.reply },
      ]);
      return;
    case "status":
      await changeStatus(site, scene, step.status);
      return;
    default:
      return step satisfies never;
  }
}

// Starts the quest through the site, so the construct opens it, then does
// its steps in order.
async function makeQuest(
  site: Site,
  owner: string,
  quest: ReviewQuest,
): Promise<void> {
  const started = STARTED.parse(
    await callApi(site, "/quests", {
      method: "POST",
      body: { from: quest.from, name: quest.name, why: quest.why },
    }),
  );
  const scene: Scene = {
    owner,
    questId: started.id,
    chatId: started.conversationId,
  };
  await inOrder(quest.steps, (step) => runStep(site, scene, step));
}

// Makes the account's spells, then its quests, oldest first.
async function fill(
  site: Site,
  owner: string,
  content: ReviewContent,
): Promise<void> {
  const [{ createSpell }, { USER_ID }] = await Promise.all([
    import("@/spells/own-spell-store.ts"),
    import("@/ids.ts"),
  ]);
  await inOrder(content.spells, ({ name, ...definition }) =>
    createSpell(USER_ID.parse(owner), {
      name,
      definition: {
        destination: definition.destination,
        castReply: [...definition.castReply],
        savedReply: [...definition.savedReply],
        stopReply: [...definition.stopReply],
        invalidReply: [...definition.invalidReply],
      },
    }),
  );
  await inOrder(content.quests, (quest) => makeQuest(site, owner, quest));
}

// The account's experience, as its Profile shows it.
async function experienceLine(owner: string): Promise<string> {
  const [{ readExperience }, { USER_ID }] = await Promise.all([
    import("@/experience/experience-store.ts"),
    import("@/ids.ts"),
  ]);
  const { experience, circle, title } = await readExperience(
    USER_ID.parse(owner),
  );
  return `${experience} experience, circle ${circle} (${title})`;
}

// Remakes and fills the review accounts derived from base, then prints a
// sign-in link for each.
async function reviewData(base?: string): Promise<void> {
  const { databaseUrl, sessionSecret } = pointAtLocalDatabase();
  const origin = localSiteOrigin();
  const contents: Readonly<Record<ReviewKind, ReviewContent>> = {
    empty: { spells: [], quests: [] },
    typical: TYPICAL,
    crowded: CROWDED,
  };
  const links: string[] = [];
  try {
    await inOrder(reviewAccounts(base), async (account) => {
      const user = await remakeAccount(account);
      const owner = user.id;
      const site = {
        origin,
        session: createSessionToken(user, sessionSecret, new Date()),
      };
      await checkSite(site, account);
      await fill(site, owner, contents[account.kind]);
      console.log(
        `OK: ${account.kind}, ${account.email}: ${await experienceLine(owner)}.`,
      );
      const link = await createSignInLink(databaseUrl, origin, account.email);
      links.push(`${account.kind}: ${link.href}`);
    });
  } finally {
    await closeAppDatabase();
  }
  console.log(
    `\nSign-in links, each working for 30 minutes:\n${links.join("\n")}`,
  );
}

export { reviewData };
