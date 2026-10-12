import { expect } from "@playwright/test";
import { CHAT_API_PATH } from "@/tutor/chat-protocol.ts";
import { mockChatName } from "@/tutor/mock-chat-name.ts";
import { COPY } from "@/ui/copy.ts";
import {
  chatMessages,
  exchange,
  expectMessages,
  fromUser,
  personaName,
  sendMessage,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";
import { WHOLE_DATABASE_TAG } from "./whole-database.ts";

// The last line of the mock tutor's reply, inside its Python block.
const MOCK_REPLY_END = "bpy.ops.mesh.bevel(offset=0.1)";
const MOCK_REPLY_SHORTCUT = "Ctrl+B";
// Her first message and its reply, which the mock names the chat from.
const FIRST_EXCHANGE = 2;

// Needs the database to itself, to have no projects at all.
test("use_case_new_chat_without_projects", { tag: WHOLE_DATABASE_TAG }, async ({
  page,
  testData,
}) => {
  await testData.deleteAllProjects();
  await logIn(page);

  await test.step("the site asks her to create a project first", async () => {
    await page.goto("/chats/new");

    await expect(
      page.getByText(
        COPY.newChat.needsProject(COPY.newChat.projectLink).join(""),
      ),
    ).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: COPY.newChat.start }),
    ).toHaveCount(0);
  });

  await test.step("the link leads to her projects", async () => {
    await page
      .getByRole("link", { exact: true, name: COPY.newChat.projectLink })
      .click();

    await expect(page).toHaveURL("/projects");
    await expect(page.getByLabel(COPY.projects.nameLabel)).toBeVisible();
  });
});

test("use_case_send_message", async ({ page, testData }) => {
  const chat = await testData.chat(await testData.project());
  const tutor = personaName(chat.personaId);
  const send = page.getByRole("button", { name: COPY.chat.send });
  const message = "Hello, tutor!";
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);

  await test.step("an empty message can't be sent", async () => {
    await expect(send).toBeDisabled();
    await page.getByLabel(COPY.chat.messageLabel).fill("   ");
    await expect(send).toBeDisabled();
  });

  // Holds the request until the checks of the waiting chat are done.
  const reply = Promise.withResolvers<void>();
  await page.route(CHAT_API_PATH, async (route) => {
    await reply.promise;
    await route.continue();
  });

  await test.step("her message shows at once, and the tutor thinks", async () => {
    await sendMessage(page, message);

    await expect(chatMessages(page).first()).toContainText(fromUser(message), {
      useInnerText: true,
    });
    await expect(page.getByText(COPY.chat.thinking(tutor))).toBeVisible();
    await page.getByLabel(COPY.chat.messageLabel).fill("And another thing");
    await expect(send).toBeDisabled();
  });

  await test.step("the reply follows under the persona's name", async () => {
    reply.resolve();

    await expectMessages(page, exchange(tutor, message));
    await expect(page.getByText(COPY.chat.thinking(tutor))).toHaveCount(0);
  });

  await test.step("both are still there after a reload", async () => {
    await page.reload();

    await expectMessages(page, exchange(tutor, message));
  });
});

// Checks the visible outcome after a dropped connection. The race in which
// the reply is saved after her next message is
// use_case_send_while_tutor_replies.
test("use_case_leave_during_reply", async ({ page, testData }) => {
  const chat = await testData.chat(await testData.project());
  const tutor = personaName(chat.personaId);
  const first = "Tell me about bevels.";
  const second = "Thanks, and then?";
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);

  await test.step("her connection drops before the reply arrives", async () => {
    // The server gets the message and replies in full; the browser never
    // sees the reply.
    await page.route(CHAT_API_PATH, async (route) => {
      await (await route.fetch()).body();
      await route.abort("connectionclosed");
    });
    await sendMessage(page, first);

    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await page.unroute(CHAT_API_PATH);
  });

  await test.step("the reopened chat shows the whole reply", async () => {
    await expect(async () => {
      await page.reload();
      await expectMessages(page, exchange(tutor, first));
    }).toPass();
    await expect(chatMessages(page).last()).toContainText(MOCK_REPLY_END);
  });

  await test.step("her next message comes after that reply", async () => {
    const conversation = [
      ...exchange(tutor, first),
      ...exchange(tutor, second),
    ];
    await sendMessage(page, second);
    await expectMessages(page, conversation);
    await page.reload();

    await expectMessages(page, conversation);
  });
});

test("use_case_reopen_chat", async ({ page, testData }) => {
  const project = await testData.project();
  const chat = await testData.chat(project, "mr-tee");
  const tutor = personaName(chat.personaId);
  const first = "How do I bevel an edge?";
  const second = "Can I make it rounder?";
  const conversation = [...exchange(tutor, first), ...exchange(tutor, second)];
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);
  await sendMessage(page, first);
  await expectMessages(page, exchange(tutor, first));
  await sendMessage(page, second);
  await expectMessages(page, conversation);

  await test.step("she picks the chat by its name from its project", async () => {
    const name = mockChatName(first, FIRST_EXCHANGE);
    const title = COPY.chatName.listTitle(name, tutor);
    const link = page.getByRole("link", { name: title });
    // Naming follows the first reply's save, which may still be running.
    await expect(async () => {
      await page.goto(`/projects/${project.id}`);
      await expect(link).toBeVisible();
    }).toPass();
    await link.click();

    await expect(page).toHaveURL(`/chats/${chat.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: COPY.chat.heading(tutor) }),
    ).toContainText(name);
  });

  await test.step("the whole conversation shows, in order", async () => {
    await expectMessages(page, conversation);
  });

  await test.step("replies keep their formatting", async () => {
    const firstReply = chatMessages(page).nth(1);

    await expect(firstReply.getByRole("listitem")).toHaveText([
      "Select the edges.",
      `Press ${MOCK_REPLY_SHORTCUT} to bevel them.`,
    ]);
    await expect(firstReply.getByRole("code")).toContainText(MOCK_REPLY_END);
    await expect(firstReply).not.toContainText("**");
    await expect(firstReply).not.toContainText("```");
  });

  await test.step("she can send a new message", async () => {
    await expect(page.getByLabel(COPY.chat.messageLabel)).toBeEditable();
  });
});

test("use_case_continue_chat", async ({ page, testData }) => {
  const chat = await testData.chat(await testData.project());
  const tutor = personaName(chat.personaId);
  const question = "Which shortcut bevels an edge?";
  const followUp = "Repeat that shortcut, please.";
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);
  await sendMessage(page, question);
  await expect(chatMessages(page).last()).toContainText(MOCK_REPLY_SHORTCUT);

  // The mock tutor doesn't read the history, so this checks that the
  // conversation carries on after a reopen; reply.test.ts checks that the
  // model gets the earlier turns.
  await test.step("she reopens the chat and refers back", async () => {
    await page.reload();
    await sendMessage(page, followUp);

    await expectMessages(page, [
      ...exchange(tutor, question),
      ...exchange(tutor, followUp),
    ]);
    await expect(chatMessages(page).last()).toContainText(MOCK_REPLY_SHORTCUT);
  });
});

// The label part only: each reply's speaker and the heading name the chat's
// persona, before and after a reopen. The manner of speech needs Claude.
test("use_case_persona_voice_consistent", async ({ page, testData }) => {
  const chat = await testData.chat(await testData.project(), "span-tines");
  const tutor = personaName(chat.personaId);
  const heading = page.getByRole("heading", {
    level: 1,
    name: COPY.chat.heading(tutor),
  });
  const before = [...exchange(tutor, "Hi Stan."), ...exchange(tutor, "Next?")];
  const after = [...before, ...exchange(tutor, "One more thing.")];
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);

  await test.step("she chats for a while", async () => {
    await expect(heading).toBeVisible();
    await sendMessage(page, "Hi Stan.");
    await expectMessages(page, exchange(tutor, "Hi Stan."));
    await sendMessage(page, "Next?");
    await expectMessages(page, before);
  });

  await test.step("she leaves, reopens the chat and carries on", async () => {
    await page.goto(`/projects/${chat.projectId}`);
    await page.goto(`/chats/${chat.id}`);

    await expect(heading).toBeVisible();
    await expectMessages(page, before);
    await sendMessage(page, "One more thing.");
    await expectMessages(page, after);
  });
});
