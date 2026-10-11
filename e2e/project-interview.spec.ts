// A new project's interview: the project is created through the site, which
// opens its interview chat with the tutor's first question, and every chat
// in a project whose memory is empty interviews her. The mock tutor shows
// its prompt when a message says `/mock-system-prompt`, and saves to the
// memory when a message says `/mock-tool update_memory <edit>`.
import { expect, type Locator, type Page } from "@playwright/test";
import { type ProjectId, parseProjectId } from "@/ids.ts";
import type { PersonaId } from "@/personas/index.ts";
import { COPY } from "@/ui/copy.ts";
import {
  chatMessages,
  fromUser,
  lastMessage,
  personaName,
  sendMessage,
} from "./chat-page.ts";
import { type TestData, test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

const UNIQUE_LENGTH = 8;

// The heading of the interview's part of the tutor's prompt.
const INTERVIEW_PROMPT = "# The project interview";

// Where her first answer is in the interview chat: after the opening, her
// request for the prompt, and its reply.
const ANSWER_POSITION = 3;

const CHAT_PATH = /\/chats\/[\da-f-]{36}$/u;
const PROJECT_PATH = /^\/projects\/(?<id>[\da-f-]{36})$/u;

// A project the test made through the site.
interface SiteProject {
  readonly id: ProjectId;
  readonly name: string;
}

// A word no other test uses, so text a test looks for is its own.
function unique(word: string): string {
  return `${word}-${crypto.randomUUID().slice(0, UNIQUE_LENGTH)}`;
}

// Creates a project through the projects page, with personaId for its
// interview chat, and waits for that chat to open. The project is deleted
// when the test ends.
async function createProjectOnSite(
  page: Page,
  testData: TestData,
  personaId: PersonaId,
): Promise<SiteProject> {
  const name = unique("Interview project");
  await page.goto("/projects");
  await page.getByRole("textbox", { name: COPY.projects.nameLabel }).fill(name);
  await page.getByRole("radio", { name: personaName(personaId) }).check();
  await page.getByRole("button", { name: COPY.projects.create }).click();
  await expect(page).toHaveURL(CHAT_PATH);

  const backLink = page.getByRole("link", { exact: true, name });
  const href = (await backLink.getAttribute("href")) ?? "";
  const { id: linkedId = "" } = PROJECT_PATH.exec(href)?.groups ?? {};
  const id = parseProjectId(linkedId);
  if (id === undefined) {
    throw new Error(`The chat links to its project as "${href}"`);
  }
  testData.removeAfterTest(id);
  return { id, name };
}

// Asks the tutor in the chat on the page for its prompt, and returns its
// reply.
async function tutorPrompt(page: Page): Promise<Locator> {
  await sendMessage(page, "/mock-system-prompt");
  const reply = lastMessage(page);
  await expect(reply).toContainText("You are a Blender tutor");
  return reply;
}

// Has the tutor in the chat on the page save text to the empty memory, and
// waits for the notice of the change.
async function tutorSaves(page: Page, text: string): Promise<void> {
  const edit = JSON.stringify({ oldText: "", newText: text });
  await sendMessage(page, `/mock-tool update_memory ${edit}`);
  await expect(
    lastMessage(page).getByRole("complementary", {
      name: COPY.memory.changeLabel,
    }),
  ).toContainText(text);
}

function currentMemory(page: Page): Locator {
  return page.getByRole("region", { name: COPY.memory.currentLabel });
}

test("use_case_new_project", async ({ page, testData }) => {
  await logIn(page);

  await test.step("Hippy is chosen for the first chat until she picks another", async () => {
    await page.goto("/projects");
    await expect(
      page.getByRole("radio", { name: personaName("hippy") }),
    ).toBeChecked();
  });

  const project = await createProjectOnSite(page, testData, "mr-t");

  await test.step("the interview chat opens with the tutor's first question", async () => {
    await expect(
      page.getByRole("heading", {
        name: COPY.chat.heading(personaName("mr-t")),
      }),
    ).toBeVisible();
    await expect(chatMessages(page)).toHaveCount(1);
    // The speaker's name, which is "You" on her own messages.
    const opening = chatMessages(page).first();
    await expect(
      opening.getByText(personaName("mr-t"), { exact: true }),
    ).toBeVisible();
    await expect(opening.getByText(COPY.chat.you, { exact: true })).toHaveCount(
      0,
    );
  });

  // Tests running beside this one create projects too, so the order of the
  // list is use_case_view_projects' to check.
  await test.step("the project is in her list, with the interview chat", async () => {
    await page.goto("/projects");
    await expect(
      page.getByRole("link", { exact: true, name: project.name }),
    ).toHaveAttribute("href", `/projects/${project.id}`);
    await page.goto(`/projects/${project.id}`);
    const chats = page.getByRole("list").getByRole("listitem");
    await expect(chats).toHaveCount(1);
    await expect(chats.first()).toContainText(personaName("mr-t"));
  });
});

test("use_case_project_interview", async ({ page, testData }) => {
  const goal = unique("fox");
  const summary = `## Goals\n\n- A low-poly ${goal}\n\n## Milestones\n\n- [ ] Block out the body`;
  await logIn(page);
  const project = await createProjectOnSite(page, testData, "hippy");
  const interviewChat = new URL(page.url()).pathname;

  await test.step("the tutor is interviewing her, and she answers", async () => {
    await expect(await tutorPrompt(page)).toContainText(INTERVIEW_PROMPT);
    await sendMessage(page, `I want to make a ${goal} for my game.`);
    await expect(lastMessage(page)).toContainText(personaName("hippy"));
    await expect(chatMessages(page).nth(ANSWER_POSITION)).toContainText(
      fromUser(`I want to make a ${goal} for my game.`),
      { useInnerText: true },
    );
  });

  await test.step("the tutor saves her goals and milestones, with a notice", async () => {
    await tutorSaves(page, summary);
    await expect(lastMessage(page)).toContainText(COPY.memory.changed(1));
  });

  await test.step("the memory holds them, as a version by the tutor", async () => {
    await page.goto(`/projects/${project.id}/memory`);
    await expect(currentMemory(page)).toContainText(`A low-poly ${goal}`);
    await expect(currentMemory(page)).toContainText("Block out the body");
    await expect(
      page
        .getByRole("list", { name: COPY.memory.historyHeading })
        .getByRole("listitem"),
    ).toContainText([`by ${COPY.memory.byTutor}`]);
  });

  await test.step("from then on the project's chats don't interview her", async () => {
    await page.goto(interviewChat);
    await expect(await tutorPrompt(page)).not.toContainText(INTERVIEW_PROMPT);
  });
});

test("use_case_resume_interview", async ({ page, testData }) => {
  const goal = unique("castle");
  await logIn(page);
  const project = await createProjectOnSite(page, testData, "hippy");

  await test.step("she answers once and leaves before anything is saved", async () => {
    await sendMessage(page, `I'd like to build a ${goal}.`);
    await expect(lastMessage(page)).toContainText(personaName("hippy"));
    await page.goto(`/projects/${project.id}/memory`);
    await expect(page.getByText(COPY.memory.empty)).toBeVisible();
  });

  await test.step("a new chat in the project carries on with the interview", async () => {
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: COPY.project.startChat }).click();
    await page.getByRole("radio", { name: personaName("mr-t") }).check();
    await page.getByRole("button", { name: COPY.newChat.start }).click();
    await expect(page).toHaveURL(CHAT_PATH);
    await expect(await tutorPrompt(page)).toContainText(INTERVIEW_PROMPT);
  });

  await test.step("the tutor saves what it learned there", async () => {
    await tutorSaves(page, `## Goals\n\n- A ${goal}`);
    await page.goto(`/projects/${project.id}/memory`);
    await expect(currentMemory(page)).toContainText(`A ${goal}`);
  });
});
