// The buddies' check-ins, in the test database: the scheduler's route
// (src/app/api/check-ins/route.ts) starting them, the project's setting,
// the unread mark and the email's link to turn them off. The mock buddy
// answers the check-in kickoff with MOCK_CHECK_IN and the project's memory
// (mock-opening.ts). Each scene makes its project quiet by moving its chats
// and messages, and its last check-in, days into the past.
import { eq, inArray } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { User } from "@/accounts/users-store.ts";
import ChatPage from "@/app/(workspace)/chats/[chatId]/page.tsx";
import { saveCheckInSettingAction } from "@/app/(workspace)/projects/[projectId]/(overview)/actions.ts";
import ProjectPage from "@/app/(workspace)/projects/[projectId]/(overview)/page.tsx";
import { GET } from "@/app/api/check-ins/route.ts";
import { turnOffCheckInsAction } from "@/app/check-ins/off/actions.ts";
import type { BuddyId } from "@/buddies/index.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { listChats, listMessages } from "@/chats/store.ts";
import type { CheckInFrequency } from "@/check-ins/check-in-frequency.ts";
import {
  readCheckInFrequency,
  saveCheckInFrequency,
} from "@/check-ins/check-in-store.ts";
import { runCheckIns as runCheckInsWithLimit } from "@/check-ins/check-ins.ts";
import { CHECK_INS_OFF_PATH } from "@/check-ins/check-ins-off-link.ts";
import { getDb } from "@/db/client.ts";
import { chats, messages, projects } from "@/db/tables/projects-and-chats.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { MEMORY_VERSION_NUMBER } from "@/memory/memory.ts";
import { saveMemory } from "@/memory/memory-store.ts";
import type { Project } from "@/projects/store.ts";
import { MONTHLY_QUOTA_MICRO_USD } from "@/quota/quota-terms.ts";
import { MOCK_CHECK_IN } from "@/replies/mock-opening.ts";
import { CHECK_IN_SETTING_COPY } from "@/ui/copy/check-ins.ts";
import { emailsTo } from "../../support/email/outbox-files.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { spend } from "../../support/test-database/spend-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { formOf, messageText } from "../test-database/chat-test-kit.ts";
import { expectRedirect } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";
import { twoUsers } from "../test-database/two-users-test-kit.ts";

const CRON_SECRET = "test-cron-secret";

// The origin a direct run's email links lead to.
const ORIGIN = "http://localhost";

const MEMORY =
  "## Goal\n\n- Model a sea turtle\n\n## Progress\n\n- Stuck on the flipper topology";

const DAY_MS = 86_400_000;

// How long a scene's project has been quiet: due a daily or a few-times-a-week
// check-in, but not a weekly one.
const QUIET_DAYS = 3;

// Longer than QUIET_DAYS, so a scene this quiet is longest-waiting.
const LONGER_QUIET_DAYS = 5;

// The link to turn check-ins off in a check-in email's text.
const OFF_LINK = /https?:\/\/\S+\/check-ins\/off\?\S+/u;

// The chat link in a check-in email's text.
const CHAT_LINK = /https?:\/\/\S+\/chats\/(?<chatId>[\w-]+)/u;

vi.mock("next/cache", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/cache")>()),
  refresh: (): void => {
    // The page a Server Action refreshes isn't there in a server test.
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// A project of user's with memory and one chat, in buddyId, that has been
// quiet for quietDays, with check-ins at frequency.
async function checkInScene(
  user: User,
  {
    frequency = "daily",
    quietDays = QUIET_DAYS,
    buddyId = "mr-tee",
  }: {
    readonly frequency?: CheckInFrequency;
    readonly quietDays?: number;
    readonly buddyId?: BuddyId;
  } = {},
): Promise<Project> {
  const data = testData(user);
  const project = await data.project();
  const chat = await data.chat(project, buddyId);
  await data.exchanges(chat, [
    { message: "The edge loops pinch", reply: [{ type: "text", text: "Ok" }] },
  ]);
  await Promise.all([
    saveMemory(user.id, {
      projectId: project.id,
      text: MEMORY,
      basedOn: MEMORY_VERSION_NUMBER.parse(0),
      author: "user",
    }),
    saveCheckInFrequency(user.id, project.id, frequency),
  ]);
  await quietFor(project, quietDays);
  return project;
}

// Moves the project's chats and messages, and its last check-in, days into
// the past, as if no one had touched it since.
async function quietFor(project: Project, days: number): Promise<void> {
  const before = new Date(Date.now() - days * DAY_MS);
  const db = getDb();
  const projectChats = db
    .select({ id: chats.id })
    .from(chats)
    .where(eq(chats.projectId, project.id));
  await db.batch([
    db
      .update(messages)
      .set({ createdAt: before })
      .where(inArray(messages.chatId, projectChats)),
    db
      .update(chats)
      .set({ createdAt: before })
      .where(eq(chats.projectId, project.id)),
    db
      .update(projects)
      .set({ lastCheckInAt: before })
      .where(eq(projects.id, project.id)),
  ]);
}

// The scheduler's request to run the check-ins, with the secret, or with
// the headers given instead.
function runCheckIns(
  headers: Readonly<Record<string, string>> = {
    authorization: `Bearer ${CRON_SECRET}`,
  },
): Promise<Response> {
  vi.stubEnv("CRON_SECRET", CRON_SECRET);
  return GET(new Request("http://localhost/api/check-ins", { headers }));
}

// The check-in chats in user's project: its unread chats.
async function checkIns(user: User, project: Project): Promise<number> {
  const projectChats = await listChats(user.id, project.id);
  return projectChats.filter((chat) => chat.unread).length;
}

describe("use_case_check_in", () => {
  test("a quiet project gets one unread check-in from its latest buddy, from its memory, emailed with links", async () => {
    const user = await testUser();
    const project = await checkInScene(user);

    const responses = await Promise.all([runCheckIns(), runCheckIns()]);

    expect(responses.map(({ status }) => status)).toEqual([
      HTTP_STATUS.ok,
      HTTP_STATUS.ok,
    ]);
    const [checkIn, earlier] = await listChats(user.id, project.id);
    expect(earlier?.unread).toBe(false);
    expect(checkIn).toMatchObject({ unread: true, buddy: { name: "Mr. Tee" } });
    if (checkIn === undefined) {
      throw new Error("No check-in chat");
    }
    const [opening, ...rest] = await listMessages(user.id, checkIn.id);
    expect(rest).toEqual([]);
    const text = messageText(opening);
    expect(text).toContain(MOCK_CHECK_IN);
    expect(text).toContain("Stuck on the flipper topology");

    const emails = await emailsTo(user.email);
    expect(emails).toHaveLength(1);
    const [email] = emails;
    expect(email?.subject).toContain(project.name);
    expect(email?.text).toContain(MOCK_CHECK_IN);
    const { chatId } = CHAT_LINK.exec(email?.text ?? "")?.groups ?? {};
    expect(chatId).toBe(checkIn.id);
    expect(email?.text).toMatch(OFF_LINK);
  });

  test("a project with check-ins off, or used within its interval, gets none", async () => {
    const user = await testUser();
    const off = await checkInScene(user, { frequency: "off" });
    const weeklyButActive = await checkInScene(user, {
      frequency: "weekly",
      quietDays: QUIET_DAYS,
    });

    await runCheckIns();

    expect(await checkIns(user, off)).toBe(0);
    expect(await checkIns(user, weeklyButActive)).toBe(0);
    expect(await emailsTo(user.email)).toEqual([]);
  });

  test("an unread check-in waits for her before the next one", async () => {
    const user = await testUser();
    const project = await checkInScene(user);
    await runCheckIns();
    await quietFor(project, QUIET_DAYS);

    await runCheckIns();

    expect(await checkIns(user, project)).toBe(1);
  });

  test("with her quota used up, the check-in is skipped without error", async () => {
    const user = await testUser();
    const project = await checkInScene(user);
    await spend(user, MONTHLY_QUOTA_MICRO_USD);

    const response = await runCheckIns();

    expect(response.status).toBe(HTTP_STATUS.ok);
    expect(await response.json()).toMatchObject({ failed: 0 });
    expect(await checkIns(user, project)).toBe(0);
    expect(await emailsTo(user.email)).toEqual([]);
  });

  test("a project skipped for a used-up quota waits its interval, so it doesn't crowd out the next run", async () => {
    const [spent, other] = await Promise.all([testUser(), testUser()]);
    const [spentProject, otherProject] = await Promise.all([
      checkInScene(spent, { quietDays: LONGER_QUIET_DAYS }),
      checkInScene(other),
    ]);
    await spend(spent, MONTHLY_QUOTA_MICRO_USD);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      // The backlog line is checked below, not printed.
    });

    const first = await runCheckInsWithLimit(ORIGIN, 1);
    const second = await runCheckInsWithLimit(ORIGIN, 1);

    expect(first).toEqual({ started: 0, skipped: 1, failed: 0 });
    expect(second).toEqual({ started: 1, skipped: 0, failed: 0 });
    expect(await checkIns(spent, spentProject)).toBe(0);
    expect(await checkIns(other, otherProject)).toBe(1);
    expect(warn).toHaveBeenCalledWith(
      "[check-in-backlog]",
      expect.stringContaining("limit of 1 check-ins"),
    );
  });

  test("a request without the scheduler's secret starts nothing", async () => {
    const user = await testUser();
    const project = await checkInScene(user);

    const responses = await Promise.all([
      runCheckIns({}),
      runCheckIns({ authorization: "Bearer not-the-secret" }),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([
      HTTP_STATUS.unauthorized,
      HTTP_STATUS.unauthorized,
    ]);
    expect(await checkIns(user, project)).toBe(0);
  });
});

describe("use_case_open_unread_check_in", () => {
  test("a check-in is unread on the Chats page until she opens it", async () => {
    const user = await testUser();
    await checkInScene(user);
    await runCheckIns();
    await signIn(user);
    const [checkIn] = await listAllChats(user.id);
    expect(checkIn?.unread).toBe(true);

    await ChatPage({
      params: Promise.resolve({ chatId: checkIn?.id ?? "" }),
      searchParams: Promise.resolve({}),
    });

    const [opened] = await listAllChats(user.id);
    expect(opened).toMatchObject({ id: checkIn?.id, unread: false });
  });
});

// The project's page, as the signed-in user sees it.
async function projectPageHtml(project: Project): Promise<string> {
  return renderToStaticMarkup(
    await ProjectPage({
      params: Promise.resolve({ projectId: project.id }),
      searchParams: Promise.resolve({}),
    }),
  );
}

describe("use_case_set_check_ins", () => {
  test("saves how often the buddy checks in on her project, and on no one else's", async () => {
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    const { her, herData, other, otherData } = await twoUsers();
    const [project, foreign] = await Promise.all([
      herData.project(),
      otherData.project(),
    ]);
    expect(await readCheckInFrequency(her.id, project.id)).toBe("off");

    const [saved, refused] = await Promise.all([
      saveCheckInSettingAction(
        { kind: "idle" },
        formOf({ projectId: project.id, frequency: "few-times-a-week" }),
      ),
      saveCheckInSettingAction(
        { kind: "idle" },
        formOf({ projectId: foreign.id, frequency: "daily" }),
      ),
    ]);

    expect(saved).toEqual({ kind: "saved" });
    expect(refused).toEqual({
      kind: "invalid",
      message: CHECK_IN_SETTING_COPY.invalid,
    });
    expect(await readCheckInFrequency(her.id, project.id)).toBe(
      "few-times-a-week",
    );
    expect(await readCheckInFrequency(other.id, foreign.id)).toBe("off");
  });
});

describe("check-ins stay hidden until CRON_SECRET is set", () => {
  test("with the secret set, the project page shows the setting and it saves", async () => {
    vi.stubEnv("CRON_SECRET", CRON_SECRET);
    const user = await testUser();
    await signIn(user);
    const project = await testData(user).project();

    const html = await projectPageHtml(project);
    const saved = await saveCheckInSettingAction(
      { kind: "idle" },
      formOf({ projectId: project.id, frequency: "weekly" }),
    );

    expect(html).toContain(CHECK_IN_SETTING_COPY.intro);
    expect(saved).toEqual({ kind: "saved" });
    expect(await readCheckInFrequency(user.id, project.id)).toBe("weekly");
  });

  test("without the secret, the project page hides the setting and saving it is refused", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const user = await testUser();
    await signIn(user);
    const project = await testData(user).project();

    const html = await projectPageHtml(project);
    const refused = await saveCheckInSettingAction(
      { kind: "idle" },
      formOf({ projectId: project.id, frequency: "daily" }),
    );

    expect(html).not.toContain(CHECK_IN_SETTING_COPY.intro);
    expect(html).not.toContain(CHECK_IN_SETTING_COPY.heading);
    expect(refused).toEqual({
      kind: "invalid",
      message: CHECK_IN_SETTING_COPY.unavailable,
    });
    expect(await readCheckInFrequency(user.id, project.id)).toBe("off");
  });
});

describe("use_case_turn_off_check_ins_from_email", () => {
  test("the email's link turns check-ins off once she confirms, and a forged one changes nothing", async () => {
    const user = await testUser();
    const project = await checkInScene(user);
    await runCheckIns();
    const [email] = await emailsTo(user.email);
    const [link = ""] = OFF_LINK.exec(email?.text ?? "") ?? [];
    const parameters = Object.fromEntries(new URL(link).searchParams);

    await expectRedirect(
      () => turnOffCheckInsAction(formOf({ ...parameters, token: "forged" })),
      `${CHECK_INS_OFF_PATH}?${new URLSearchParams({ ...parameters, token: "forged" }).toString()}`,
    );
    expect(await readCheckInFrequency(user.id, project.id)).toBe("daily");

    await expectRedirect(
      () => turnOffCheckInsAction(formOf(parameters)),
      `${CHECK_INS_OFF_PATH}?${new URLSearchParams(parameters).toString()}`,
    );
    expect(await readCheckInFrequency(user.id, project.id)).toBe("off");
  });
});
