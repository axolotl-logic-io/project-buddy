// The "Project memory" use cases, and the ones that check every chat in a
// project works from its memory. The mock tutor changes the memory when a
// message says `/mock-tool update_memory <edit>`, and replies with its system
// prompt, where a chat gets the memory, when a message says
// `/mock-system-prompt`.
import { expect, type Locator, type Page } from "@playwright/test";
import { CHAT_COPY, NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import {
  chatMessages,
  lastMessage,
  personaName,
  sendMessage,
  tutorEdits,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import {
  currentMemory,
  expectHistory,
  memoryField,
  openMemory,
} from "./memory-page.ts";

const UNIQUE_LENGTH = 8;

// A word no other test uses, so text a test looks for is its own.
function unique(word: string): string {
  return `${word}-${crypto.randomUUID().slice(0, UNIQUE_LENGTH)}`;
}

// Asks the tutor in the chat on the page for its prompt, and returns its
// reply.
async function tutorPrompt(page: Page): Promise<Locator> {
  await sendMessage(page, "/mock-system-prompt");
  const reply = lastMessage(page);
  await expect(reply).toContainText("You are a Blender tutor");
  return reply;
}

const BY_USER = `by ${MEMORY_COPY.byUser}`;
const BY_TUTOR = `by ${MEMORY_COPY.byTutor}`;
const RESTORED_VERSION = 3;

test("use_case_tutor_updates_memory", async ({ page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const milestone = unique("roof");
  await logIn(page);

  await test.step("the tutor changes the memory and shows the change", async () => {
    await page.goto(`/chats/${chat.id}`);
    await tutorEdits(page, "", `- Finished the ${milestone}`);
    await expect(lastMessage(page)).toContainText(MEMORY_COPY.changed(1));
  });

  await test.step("the memory shows it as a version by the tutor", async () => {
    await openMemory(page, project);
    await expect(currentMemory(page)).toContainText(
      `Finished the ${milestone}`,
    );
    await expectHistory(page, [[MEMORY_COPY.versionHeading(1), BY_TUTOR]]);
  });
});

test("use_case_view_memory", async ({ page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const goal = unique("fox");
  await logIn(page);

  await test.step("an empty memory says so and offers the editor", async () => {
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: MEMORY_COPY.link }).click();
    await expect(currentMemory(page)).toContainText(MEMORY_COPY.empty);
    await expect(memoryField(page)).toHaveValue("");
    await expect(page.getByText(MEMORY_COPY.noHistory)).toBeVisible();
  });

  await test.step("the newest version shows formatted, with every version listed", async () => {
    await page.goto(`/chats/${chat.id}`);
    await tutorEdits(page, "", `## Goals\n\n- Model a ${goal}`);
    await tutorEdits(page, "", "- Prefers **shortcuts**");
    await openMemory(page, project);
    await expect(
      currentMemory(page).getByRole("heading", { name: "Goals" }),
    ).toBeVisible();
    await expect(currentMemory(page).getByText("shortcuts")).toHaveAttribute(
      "data-streamdown",
      "strong",
    );
    await expectHistory(page, [
      [`${MEMORY_COPY.versionHeading(2)} ${MEMORY_COPY.newest}`, BY_TUTOR],
      [MEMORY_COPY.versionHeading(1), BY_TUTOR],
    ]);
  });
});

test("use_case_edit_memory", async ({ page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const correction = unique("rigging");
  await logIn(page);

  await page.goto(`/chats/${chat.id}`);
  await tutorEdits(page, "", "- Next: texture");

  await test.step("saving it unchanged adds no version; her save shows as the newest, with the one before it", async () => {
    await openMemory(page, project);
    await page.getByRole("button", { name: MEMORY_COPY.save }).click();
    await expect(page.getByRole("status")).toHaveText(MEMORY_COPY.saved);
    await memoryField(page).fill(`- Next: ${correction}`);
    await page.getByRole("button", { name: MEMORY_COPY.save }).click();
    await expect(page.getByRole("status")).toHaveText(MEMORY_COPY.saved);
    await expect(currentMemory(page)).toContainText(correction);
    await expectHistory(page, [[BY_USER], [BY_TUTOR]]);
  });

  await test.step("the chat works from her version", async () => {
    await page.goto(`/chats/${chat.id}`);
    await expect(await tutorPrompt(page)).toContainText(correction);
  });
});

test("use_case_undo_memory_change", async ({ page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const right = unique("right");
  const wrong = unique("wrong");
  await logIn(page);

  await page.goto(`/chats/${chat.id}`);
  await tutorEdits(page, "", `- ${right}`);
  await tutorEdits(page, right, wrong);

  await test.step("she restores the version before it, as the newest, and every version stays", async () => {
    await openMemory(page, project);
    await expect(currentMemory(page)).toContainText(wrong);
    await page.getByRole("button", { name: MEMORY_COPY.restore(1) }).click();
    await page
      .getByRole("alertdialog", { name: MEMORY_COPY.restoreTitle(1) })
      .getByRole("button", { name: MEMORY_COPY.restore(1) })
      .click();
    await expect(currentMemory(page)).toContainText(right);
    await expect(currentMemory(page)).not.toContainText(wrong);
    await expectHistory(page, [
      [
        `${MEMORY_COPY.versionHeading(RESTORED_VERSION)} ${MEMORY_COPY.newest}`,
        BY_USER,
      ],
      [BY_TUTOR],
      [BY_TUTOR],
    ]);
    await expect(
      page.getByRole("button", { name: MEMORY_COPY.restore(2) }),
    ).toBeVisible();
  });
});

test("use_case_memory_edit_conflict", async ({ context, page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const hers = unique("hers");
  const tutors = unique("tutors");
  await logIn(page);

  await test.step("she starts editing the memory", async () => {
    await openMemory(page, project);
    await memoryField(page).fill(`- ${hers}`);
  });

  await test.step("the tutor changes the memory in a chat before she saves", async () => {
    const chatPage = await context.newPage();
    await chatPage.goto(`/chats/${chat.id}`);
    await tutorEdits(chatPage, "", `- ${tutors}`);
    await chatPage.close();
  });

  await test.step("her save is refused and saves nothing, showing the newer version and keeping her text", async () => {
    await page.getByRole("button", { name: MEMORY_COPY.save }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: MEMORY_COPY.outdated }),
    ).toBeVisible();
    await expect(currentMemory(page)).toContainText(tutors);
    await expect(memoryField(page)).toHaveValue(`- ${hers}`);
    await expectHistory(page, [[BY_TUTOR]]);
    await page.reload();
    await expectHistory(page, [[BY_TUTOR]]);
  });
});

test("use_case_switch_persona", async ({ page, testData }) => {
  const project = await testData.project();
  const hippyChat = await testData.chat(project, "hippy");
  const hippy = personaName(hippyChat.personaId);
  const mrTee = personaName("mr-tee");
  const milestone = unique("milestone");
  const changed = unique("changed");
  await logIn(page);

  await page.goto(`/chats/${hippyChat.id}`);
  await tutorEdits(page, "", `- Next: ${milestone}`);

  await test.step("a new chat with another persona opens with the same memory, and changes it", async () => {
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("link", { name: PROJECT_COPY.startChat }).click();
    await page.getByRole("radio", { name: mrTee }).check();
    await page.getByRole("button", { name: NEW_CHAT_COPY.start }).click();
    await expect(
      page.getByRole("heading", { name: CHAT_COPY.heading(mrTee) }),
    ).toBeVisible();
    await expect(chatMessages(page).first()).toContainText(milestone);
    await expect(await tutorPrompt(page)).toContainText(milestone);
    await tutorEdits(page, milestone, changed);
  });

  await test.step("the project lists both chats, and the first keeps its persona and sees the change", async () => {
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByRole("link", { name: mrTee })).toBeVisible();
    await page.getByRole("link", { name: hippy }).click();
    await expect(
      page.getByRole("heading", { name: CHAT_COPY.heading(hippy) }),
    ).toBeVisible();
    const reply = await tutorPrompt(page);
    await expect(reply).toContainText(changed);
    await expect(reply).not.toContainText(milestone);
  });
});

test("use_case_ask_whats_next", async ({ page, testData }) => {
  const project = await testData.project();
  const firstChat = await testData.chat(project, "mr-tee");
  const laterChat = await testData.chat(project, "hippy");
  const milestone = unique("milestone");
  const next = unique("next");
  await logIn(page);

  await page.goto(`/chats/${firstChat.id}`);
  await tutorEdits(
    page,
    "",
    `## Milestones\n\n- [ ] ${milestone}\n- [ ] ${next}`,
  );

  await test.step("a chat in the project answers from the memory", async () => {
    await page.goto(`/chats/${laterChat.id}`);
    await expect(await tutorPrompt(page)).toContainText(milestone);
  });

  await test.step("after the memory changes, the next reply uses the change", async () => {
    await openMemory(page, project);
    await memoryField(page).fill(
      `## Milestones\n\n- [x] ${milestone}\n- [ ] ${next}`,
    );
    await page.getByRole("button", { name: MEMORY_COPY.save }).click();
    await expect(page.getByRole("status")).toHaveText(MEMORY_COPY.saved);
    await page.goto(`/chats/${laterChat.id}`);
    await expect(await tutorPrompt(page)).toContainText(`- [x] ${milestone}`);
  });
});
