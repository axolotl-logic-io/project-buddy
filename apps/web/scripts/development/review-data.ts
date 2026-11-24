//
// Runs after npm ci, from run.ts.
import process from "node:process";
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

// The parts of the API's answers this script reads.
const ME = z.object({ email: z.string() });
const QUEST = z.object({ id: z.string(), revision: z.number() });
const STARTED = z.object({ id: z.string() });
const LIST = z.object({ id: z.string(), type: z.string() });
const ITEMS = z.object({ items: z.array(LIST) });
const CONTENTS = z.object({
  listItems: z.array(
    z.object({ id: z.string(), taskNumber: z.number().nullable() }),
  ),
});

// The running site and the account's session cookie for it.
interface Site {
  readonly origin: string;
  readonly session: string;
}

// A quest being filled: its owner, its id, its two starting lists, the
// notes list it adds, its rites by name and its active performance.
interface Scene {
  readonly owner: string;
  readonly questId: string;
  readonly primary: string;
  readonly secondary: string;
  readonly notes: string;
  readonly rites: ReadonlyMap<string, string>;
  performance?: string | undefined;
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
    readonly method: "POST" | "DELETE";
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
  const envelope = z
    .object({
      data: z.unknown().optional(),
      items: z.array(z.unknown()).optional(),
    })
    .safeParse(answer);
  if (!envelope.success) {
    throw new Error(
      `The site answered ${requestStatus} without a JSON data object.`,
    );
  }
  if (envelope.data.items !== undefined) {
    return { items: envelope.data.items };
  }
  return envelope.data.data;
}

// Deletes the account, and with it everything it made, then invites it again
// and completes its sign-up with its name. The stores have no account
// deletion, so the row is deleted directly; its quests, rites and the rest
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

async function addListItem(
  site: Site,
  scene: Scene,
  list: string,
  input: { readonly text: string },
): Promise<void> {
  await callApi(site, `/quests/${scene.questId}/lists/${list}`, {
    method: "POST",
    body: { kind: "add", ...input },
  });
}

async function perform(
  site: Site,
  scene: Scene,
  riteId: string,
  listId: string,
): Promise<void> {
  const entry = await callApi(site, `/quests/${scene.questId}/performances`, {
    method: "POST",
    body: { riteId, listId },
  });
  scene.performance = STARTED.parse(entry).id;
}

async function send(site: Site, scene: Scene, text: string): Promise<void> {
  if (scene.performance === undefined) {
    await perform(site, scene, "capture", scene.primary);
  }
  await callApi(
    site,
    `/quests/${scene.questId}/performances/${scene.performance}`,
    {
      method: "POST",
      body: { id: crypto.randomUUID(), text },
    },
  );
}

async function runStep(
  site: Site,
  scene: Scene,
  step: QuestStep,
): Promise<void> {
  const path = `/quests/${scene.questId}`;
  switch (step.kind) {
    case "perform": {
      const rite = scene.rites.get(step.name);
      if (rite === undefined) {
        throw new Error(`Unknown review rite ${step.name}`);
      }
      let list = scene.primary;
      if (step.name === "Brainstorm" || step.name === "Margin notes") {
        list = scene.secondary;
      }
      await perform(site, scene, rite, list);
      return;
    }
    case "stop":
      if (scene.performance !== undefined) {
        await callApi(site, `${path}/performances/${scene.performance}`, {
          method: "DELETE",
        });
        scene.performance = undefined;
      }
      return;
    case "send":
      await send(site, scene, step.text);
      return;
    case "tasks":
      await inOrder(step.texts, (text) =>
        addListItem(site, scene, scene.primary, { text }),
      );
      return;
    case "task":
      await addListItem(site, scene, scene.primary, { text: step.text });
      return;
    case "plain":
      await addListItem(site, scene, scene.secondary, { text: step.text });
      return;
    case "note":
      await addListItem(site, scene, scene.notes, { text: step.text });
      return;
    case "check": {
      const endpoint = `${path}/lists/${scene.primary}`;
      const current = CONTENTS.parse(await callApi(site, endpoint));
      const task = current.listItems.find(
        ({ taskNumber }) => taskNumber === step.number,
      );
      if (task !== undefined) {
        await callApi(site, endpoint, {
          method: "POST",
          body: { kind: "check", id: task.id, checkedOff: true },
        });
      }
      return;
    }
    case "reply": {
      const [{ saveRite }, { USER_ID }] = await Promise.all([
        import("@/rites/rite-store.ts"),
        import("@/ids.ts"),
      ]);
      const rite = await saveRite(USER_ID.parse(scene.owner), {
        name: "Formatted reply",
        replies: [step.reply],
      });
      if (rite === undefined) {
        throw new Error("The review rite was not saved");
      }
      await perform(site, scene, rite.id, scene.secondary);
      await send(site, scene, step.message);
      return;
    }
    case "status": {
      const quest = QUEST.parse(await callApi(site, path));
      await callApi(site, `${path}/status`, {
        method: "POST",
        body: { status: step.status, revision: quest.revision },
      });
      return;
    }
    default:
      return step satisfies never;
  }
}

// Adds a list of notes to the quest. The API has no way to add a list.
async function addNotesList(owner: string, questId: string): Promise<string> {
  const [{ saveList }, { QUEST_ID, USER_ID }] = await Promise.all([
    import("@/lists/list-store.ts"),
    import("@/ids.ts"),
  ]);
  const list = await saveList(USER_ID.parse(owner), QUEST_ID.parse(questId), {
    name: "Notes",
    checkOff: "Complete",
    uncheck: "Reopen",
    type: "quick-note",
  });
  if (list === undefined || list === "invalid-text") {
    throw new Error("The review quest's notes list was not saved");
  }
  return list.id;
}

async function makeQuest(
  site: Site,
  identity: {
    readonly owner: string;
    readonly rites: ReadonlyMap<string, string>;
  },
  quest: ReviewQuest,
): Promise<void> {
  const started = STARTED.parse(
    await callApi(site, "/quests", {
      method: "POST",
      body: { from: quest.from, name: quest.name, why: quest.why },
    }),
  );
  const {
    items: [primary, secondary],
  } = ITEMS.parse(await callApi(site, `/quests/${started.id}/lists`));
  if (primary === undefined || secondary === undefined) {
    throw new Error("The review quest has no starting lists");
  }
  const notes = await addNotesList(identity.owner, started.id);
  const scene: Scene = {
    ...identity,
    questId: started.id,
    primary: primary.id,
    secondary: secondary.id,
    notes,
  };
  await inOrder(quest.steps, (step) => runStep(site, scene, step));
}

async function fill(
  site: Site,
  owner: string,
  content: ReviewContent,
): Promise<void> {
  const [{ saveRite }, { USER_ID }] = await Promise.all([
    import("@/rites/rite-store.ts"),
    import("@/ids.ts"),
  ]);
  const rites = new Map([
    ["Brainstorm", "brainstorm"],
    ["Capture", "capture"],
  ]);
  await inOrder(content.rites, async ({ name, replies }) => {
    const rite = await saveRite(USER_ID.parse(owner), {
      name,
      replies: [...replies],
    });
    if (rite !== undefined) {
      rites.set(name, rite.id);
    }
  });
  await inOrder(content.quests, (quest) =>
    makeQuest(site, { owner, rites }, quest),
  );
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
    empty: { rites: [], quests: [] },
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
