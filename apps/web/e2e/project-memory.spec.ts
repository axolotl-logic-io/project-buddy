// The "Project memory" use cases, and the ones that check every chat in a
// project works from its memory. The mock tutor changes the memory when a
// message says `/mock-tool update_memory <edit>`, and replies with its system
// prompt, where a chat gets the memory, when a message says
// `/mock-system-prompt`.
import { expect } from "@playwright/test";
import { CHAT_COPY, NEW_CHAT_COPY } from "@/ui/copy/chat.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROJECT_COPY } from "@/ui/copy/projects.ts";
import {
  buddyName,
  chatMessages,
  lastMessage,
  tutorEdits,
  tutorPrompt,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import {
  currentMemory,
  expectHistory,
  memoryField,
  openMemory,
} from "./memory-page.ts";
import { fillWhenReady, unique } from "./page-helpers.ts";

const BY_USER = `by ${MEMORY_COPY.byUser}`;
const BY_TUTOR = `by ${MEMORY_COPY.byTutor}`;
const RESTORED_VERSION = 3;

// Stays e2e: the mock tutor writes the memory through the chat route and DB.
test("use_case_tutor_updates_memory", async ({ account, page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const milestone = unique("roof");
  await logIn(page, account);

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

// Stays e2e: saveMemoryAction writes a version to the DB that the chat's prompt then reads.
test("use_case_edit_memory", async ({ account, page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const correction = unique("rigging");
  await logIn(page, account);

  await page.goto(`/chats/${chat.id}`);
  await tutorEdits(page, "", "- Next: texture");

  await test.step("saving it unchanged adds no version; her save shows as the newest, with the one before it", async () => {
    await openMemory(page, project);
    await page.getByRole("button", { name: MEMORY_COPY.save }).click();
    await expect(page.getByRole("status")).toHaveText(MEMORY_COPY.saved);
    await fillWhenReady(memoryField(page), `- Next: ${correction}`);
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

// Stays e2e: restoreMemoryAction writes a new version to the DB.
test("use_case_undo_memory_change", async ({ account, page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const right = unique("right");
  const wrong = unique("wrong");
  await logIn(page, account);

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

// Stays e2e: two sessions edit the same DB row.
test("use_case_memory_edit_conflict", async ({
  account,
  context,
  page,
  testData,
}) => {
  const project = await testData.project();
  const chat = await testData.chat(project);
  const hers = unique("hers");
  const tutors = unique("tutors");
  await logIn(page, account);

  await test.step("she starts editing the memory", async () => {
    await openMemory(page, project);
    await fillWhenReady(memoryField(page), `- ${hers}`);
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

// Stays e2e: the tutor's prompt is built from the DB on a real server.
test("use_case_switch_buddy", async ({ account, page, testData }) => {
  const project = await testData.project();
  const hippyChat = await testData.chat(project, "hippy");
  const hippy = hippyChat.buddy.name;
  const mrTee = buddyName("mr-tee");
  const milestone = unique("milestone");
  const changed = unique("changed");
  await logIn(page, account);

  await page.goto(`/chats/${hippyChat.id}`);
  await tutorEdits(page, "", `- Next: ${milestone}`);

  await test.step("a new chat with another buddy opens with the same memory, and changes it", async () => {
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

  await test.step("the project lists both chats, and the first keeps its buddy and sees the change", async () => {
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

// Stays e2e: the tutor's prompt is built from the DB on a real server.
test("use_case_ask_whats_next", async ({ account, page, testData }) => {
  const project = await testData.project();
  const firstChat = await testData.chat(project, "mr-tee");
  const laterChat = await testData.chat(project, "hippy");
  const milestone = unique("milestone");
  const next = unique("next");
  await logIn(page, account);

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
    await fillWhenReady(
      memoryField(page),
      `## Milestones\n\n- [x] ${milestone}\n- [ ] ${next}`,
    );
    await page.getByRole("button", { name: MEMORY_COPY.save }).click();
    await expect(page.getByRole("status")).toHaveText(MEMORY_COPY.saved);
    await page.goto(`/chats/${laterChat.id}`);
    await expect(await tutorPrompt(page)).toContainText(`- [x] ${milestone}`);
  });
});
