// A new project's interview: the project is created through the site, which
// opens its interview chat, with Hippy unless she chose another buddy
// (new-project-buddy.spec.ts), with the tutor's first
// question, and the tutor saves each answer before its next question. Only
// that chat interviews her: her other chats are lessons, and the project's
// page links back to it. The mock tutor can only show which chat's prompt
// holds the interview, and the memory so far; that the interview ends once the memory holds her goal,
// skill level, purpose and milestones is checked by the real-Claude smoke
// test (use-cases/README.md). The mock tutor shows its
// prompt when a message says `/mock-system-prompt`, saves to the memory when
// a message says `/mock-tool update_memory <edit>`, and opens a new chat by
// quoting the project's memory.
import { expect, type Locator, type Page } from "@playwright/test";
import { type ProjectId, parseProjectId } from "@/ids.ts";
import { EMPTY_MEMORY_PROMPT } from "@/tutor/memory-prompt.ts";
import { CHAT_COPY, NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";
import {
  buddyName,
  chatMessages,
  fromUser,
  lastMessage,
  sendMessage,
  tutorEdits,
  tutorPrompt,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { currentMemory, expectHistory } from "./memory-page.ts";
import { fillWhenReady, unique } from "./page-helpers.ts";

// The heading of the interview's part of the tutor's prompt.
const INTERVIEW_PROMPT = "# The project interview";

// Where her first answer is in the interview chat: after the opening, her
// request for the prompt, and its reply.
const ANSWER_POSITION = 3;

// Where her goal is in the interview chat she resumes: right after the
// opening.
const GOAL_POSITION = 1;

const BY_TUTOR = `by ${MEMORY_COPY.byTutor}`;

const CHAT_PATH = /\/chats\/[\da-f-]{36}$/u;
const INTERVIEW_CHAT_PATH = /^\/chats\/[\da-f-]{36}$/u;
const PROJECT_PATH = /^\/projects\/(?<id>[\da-f-]{36})$/u;

// A project the test made through the site.
interface SiteProject {
  readonly id: ProjectId;
  readonly name: string;
}

// Creates a project through the projects page and waits for its interview
// chat to open. The project is the test account's, so it is deleted with
// the account when the test ends.
async function createProjectOnSite(page: Page): Promise<SiteProject> {
  const name = unique("Interview project");
  await page.goto("/projects");
  await fillWhenReady(
    page.getByRole("textbox", { name: PROJECTS_COPY.nameLabel }),
    name,
  );
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

// Opens the project's page and follows its link back to the interview chat,
// whose path is `chatPath`.
async function openInterviewChat(
  page: Page,
  project: SiteProject,
  chatPath: string,
): Promise<void> {
  await page.goto(`/projects/${project.id}`);
  const link = page.getByRole("link", { name: PROJECT_COPY.interviewLink });
  await expect(link).toHaveAttribute("href", chatPath);
  await link.click();
  await expect(page).toHaveURL(chatPath);
}

// Starts a new chat in the project with the buddy `tutor`, from the
// project's page, and waits for it to open.
async function startAnotherChat(
  page: Page,
  project: SiteProject,
  tutor: string,
): Promise<void> {
  await page.goto(`/projects/${project.id}`);
  await page.getByRole("link", { name: PROJECT_COPY.startChat }).click();
  await page.getByRole("radio", { name: tutor }).check();
  await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();
  await expect(page).toHaveURL(CHAT_PATH);
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

// Checks that a new chat in the project is a lesson, whose prompt has no
// interview but the memory, and that the project's page links back to the
// interview chat at chatPath, where she gave her goal.
async function expectOnlyInterviewChatInterviews(
  page: Page,
  project: SiteProject,
  chatPath: string,
  goal: string,
): Promise<void> {
  await test.step("another chat in the project is a lesson, whose prompt has no interview", async () => {
    await startAnotherChat(page, project, buddyName("mr-tee"));
    const prompt = await tutorPrompt(page);
    await expect(prompt).not.toContainText(INTERVIEW_PROMPT);
    await expect(prompt).toContainText(`A low-poly ${goal}`);
  });

  await test.step("the project's page links back to the interview chat", async () => {
    await openInterviewChat(page, project, chatPath);
    await expect(chatMessages(page).nth(ANSWER_POSITION)).toContainText(
      fromUser(`I want to make a ${goal}.`),
      { useInnerText: true },
    );
  });
}

test("use_case_new_project", async ({ account, page }) => {
  const hippy = buddyName("hippy");
  await logIn(page, account);

  await test.step("the form asks for a name, and, with the interview buddy extra off by default, shows no buddy", async () => {
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
  const interviewChatPath = new URL(page.url()).pathname;
  expect(interviewChatPath).toMatch(INTERVIEW_CHAT_PATH);

  await test.step("the tutor's prompt holds the interview and the memory so far, and she gives her goal", async () => {
    const prompt = await tutorPrompt(page);
    await expect(prompt).toContainText(INTERVIEW_PROMPT);
    await expect(prompt).toContainText(EMPTY_MEMORY_PROMPT);
    await sendMessage(page, `I want to make a ${goal}.`);
    await expect(lastMessage(page)).toContainText(buddyName("hippy"));
    await expect(chatMessages(page).nth(ANSWER_POSITION)).toContainText(
      fromUser(`I want to make a ${goal}.`),
      { useInnerText: true },
    );
  });

  await test.step("the tutor saves each answer as she gives it", async () => {
    await tutorEdits(page, "", `## Goal\n\n- A low-poly ${goal}`);
    await expect(lastMessage(page)).toContainText(MEMORY_COPY.changed(1));
    const prompt = await tutorPrompt(page);
    await expect(prompt).toContainText(INTERVIEW_PROMPT);
    await expect(prompt).toContainText(`A low-poly ${goal}`);
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

  await expectOnlyInterviewChatInterviews(
    page,
    project,
    interviewChatPath,
    goal,
  );
});

test("use_case_resume_interview", async ({ account, page }) => {
  const goal = unique("castle");
  const skill = unique("beginner");
  await logIn(page, account);
  const project = await createProjectOnSite(page);
  const interviewChatPath = new URL(page.url()).pathname;

  await test.step("she gives her goal, the tutor saves it, and she leaves", async () => {
    await sendMessage(page, `I'd like to build a ${goal}.`);
    await expect(lastMessage(page)).toContainText(buddyName("hippy"));
    await tutorEdits(page, "", `## Goal\n\n- A ${goal}`);
    await page.goto("/projects");
  });

  await test.step("she opens the project and follows its link back to the interview chat, as she left it", async () => {
    await openInterviewChat(page, project, interviewChatPath);
    await expect(chatMessages(page).nth(GOAL_POSITION)).toContainText(
      fromUser(`I'd like to build a ${goal}.`),
      { useInnerText: true },
    );
  });

  await test.step("the tutor's prompt still holds the interview and the memory so far, and the interview carries on", async () => {
    const prompt = await tutorPrompt(page);
    await expect(prompt).toContainText(INTERVIEW_PROMPT);
    await expect(prompt).toContainText(`A ${goal}`);
    await sendMessage(page, `I'm a ${skill}.`);
    await tutorEdits(page, "", `## Skill level\n\n- ${skill}`);
    await page.goto(`/projects/${project.id}/memory`);
    await expect(currentMemory(page)).toContainText(`A ${goal}`);
    await expect(currentMemory(page)).toContainText(skill);
  });
});
