// A new project's interview: the project is created through the site, which
// opens its interview chat, always with Hippy, with the tutor's first
// question. Until the memory holds her goal, skill level, purpose and
// milestones, every chat in the project carries on the interview, and the
// tutor saves each answer before its next question. The mock tutor shows its
// prompt when a message says `/mock-system-prompt`, saves to the memory when
// a message says `/mock-tool update_memory <edit>`, and opens a new chat by
// quoting the project's memory.
import { expect, type Locator, type Page } from "@playwright/test";
import { type ProjectId, parseProjectId } from "@/ids.ts";
import { CHAT_COPY, NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";
import {
  chatMessages,
  fromUser,
  lastMessage,
  personaName,
  sendMessage,
  tutorEdits,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { currentMemory, expectHistory } from "./memory-page.ts";

const UNIQUE_LENGTH = 8;

// The heading of the interview's part of the tutor's prompt.
const INTERVIEW_PROMPT = "# The project interview";

// Where her first answer is in the interview chat: after the opening, her
// request for the prompt, and its reply.
const ANSWER_POSITION = 3;

const BY_TUTOR = `by ${MEMORY_COPY.byTutor}`;

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

// Creates a project through the projects page and waits for its interview
// chat to open. The project is the test account's, so it is deleted with
// the account when the test ends.
async function createProjectOnSite(page: Page): Promise<SiteProject> {
  const name = unique("Interview project");
  await page.goto("/projects");
  await page.getByRole("textbox", { name: PROJECTS_COPY.nameLabel }).fill(name);
  await page.getByRole("button", { name: PROJECTS_COPY.create }).click();
  await expect(page).toHaveURL(CHAT_PATH);

  const backLink = page.getByRole("link", { exact: true, name });
  const href = (await backLink.getAttribute("href")) ?? "";
  const { id: linkedId = "" } = PROJECT_PATH.exec(href)?.groups ?? {};
  const id = parseProjectId(linkedId);
  if (id === undefined) {
    throw new Error(`The chat links to its project as "${href}"`);
  }
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

// Checks the chat on the page holds only the tutor's opening, under the
// tutor's name, and returns it.
async function expectOnlyOpening(page: Page, tutor: string): Promise<Locator> {
  await expect(chatMessages(page)).toHaveCount(1);
  const opening = chatMessages(page).first();
  // The speaker's name, which is "You" on her own messages.
  await expect(opening.getByText(tutor, { exact: true })).toBeVisible();
  await expect(opening.getByText(CHAT_COPY.you, { exact: true })).toHaveCount(
    0,
  );
  return opening;
}

test("use_case_new_project", async ({ account, page }) => {
  const hippy = personaName("hippy");
  await logIn(page, account);

  await test.step("the form asks for a name, and no persona", async () => {
    await page.goto("/projects");
    await expect(
      page.getByRole("textbox", { name: PROJECTS_COPY.nameLabel }),
    ).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
  });

  const project = await createProjectOnSite(page);

  await test.step("the interview chat is with Hippy, and opens with the tutor's first question", async () => {
    await expect(
      page.getByRole("heading", { name: CHAT_COPY.heading(hippy) }),
    ).toBeVisible();
    await expect(await expectOnlyOpening(page, hippy)).toContainText("?");
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
    await expect(chats.first()).toContainText(hippy);
  });
});

test("use_case_project_interview", async ({ account, page }) => {
  const goal = unique("fox");
  const skill = unique("beginner");
  const purpose = unique("game");
  await logIn(page, account);
  const project = await createProjectOnSite(page);

  await test.step("the tutor is interviewing her, and she gives her goal", async () => {
    await expect(await tutorPrompt(page)).toContainText(INTERVIEW_PROMPT);
    await sendMessage(page, `I want to make a ${goal}.`);
    await expect(lastMessage(page)).toContainText(personaName("hippy"));
    await expect(chatMessages(page).nth(ANSWER_POSITION)).toContainText(
      fromUser(`I want to make a ${goal}.`),
      { useInnerText: true },
    );
  });

  await test.step("the tutor saves each answer as she gives it", async () => {
    await tutorEdits(page, "", `## Goal\n\n- A low-poly ${goal}`);
    await expect(lastMessage(page)).toContainText(MEMORY_COPY.changed(1));
    await sendMessage(page, `I'm a ${skill}.`);
    await tutorEdits(page, "", `## Skill level\n\n- ${skill}`);
    await sendMessage(page, `It's for my ${purpose}.`);
    await tutorEdits(page, "", `## Purpose\n\n- ${purpose}`);
  });

  await test.step("with all three saved, the tutor adds the milestones", async () => {
    await tutorEdits(page, "", "## Milestones\n\n- [ ] Block out the body");
  });

  await test.step("the memory holds every answer, each save a version by the tutor", async () => {
    await page.goto(`/projects/${project.id}/memory`);
    await expect(currentMemory(page)).toContainText(`A low-poly ${goal}`);
    await expect(currentMemory(page)).toContainText(skill);
    await expect(currentMemory(page)).toContainText(purpose);
    await expect(currentMemory(page)).toContainText("Block out the body");
    await expectHistory(page, [[BY_TUTOR], [BY_TUTOR], [BY_TUTOR], [BY_TUTOR]]);
  });
});

test("use_case_resume_interview", async ({ account, page }) => {
  const goal = unique("castle");
  const skill = unique("beginner");
  const mrTee = personaName("mr-tee");
  await logIn(page, account);
  const project = await createProjectOnSite(page);

  await test.step("she gives her goal, the tutor saves it, and she leaves", async () => {
    await sendMessage(page, `I'd like to build a ${goal}.`);
    await expect(lastMessage(page)).toContainText(personaName("hippy"));
    await tutorEdits(page, "", `## Goal\n\n- A ${goal}`);
  });

  await test.step("a new chat with another persona opens with what she said", async () => {
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: PROJECT_COPY.startChat }).click();
    await page.getByRole("radio", { name: mrTee }).check();
    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();
    await expect(page).toHaveURL(CHAT_PATH);
    await expect(await expectOnlyOpening(page, mrTee)).toContainText(
      `A ${goal}`,
    );
  });

  await test.step("it carries on the interview, and nothing she said is lost", async () => {
    await expect(await tutorPrompt(page)).toContainText(INTERVIEW_PROMPT);
    await sendMessage(page, `I'm a ${skill}.`);
    await tutorEdits(page, "", `## Skill level\n\n- ${skill}`);
    await page.goto(`/projects/${project.id}/memory`);
    await expect(currentMemory(page)).toContainText(`A ${goal}`);
    await expect(currentMemory(page)).toContainText(skill);
  });
});
