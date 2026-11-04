import { expect, test, vi } from "vitest";
import { createActivity, getOwnActivity } from "@/activities/activity-store.ts";
import { POST } from "@/app/api/workshop/route.ts";
import { createBuddy, getOwnBuddy } from "@/buddies/buddy-store.ts";
import { listAllChats } from "@/chats/all-chats.ts";
import { readGoldBalance } from "@/gold/gold-store.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { listProjects } from "@/projects/store.ts";
import { createSpell, getOwnSpell } from "@/spells/spell-store.ts";
import { WORKSHOP_RESULT, type WorkshopRequest } from "@/workshop/protocol.ts";
import { spendAllGold } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signInAs, signOut } from "../auth/current-user-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);

const REQUEST: WorkshopRequest = {
  draft: {
    kind: "buddy",
    id: "hippy",
    name: "Test buddy",
    prompt: "Workshop draft instruction.",
    whenToUse: "",
    openingRequest: "",
  },
  buddyId: "hippy",
  activityId: "open-chat",
  forceCast: false,
  opening: false,
  history: [],
  castIds: [],
  message: "/mock-system-prompt",
};
function send(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/workshop", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

test("a draft reply uses unsaved instructions, spends the acting user's gold and saves no chat", async () => {
  const user = await testUser();
  signInAs(user);
  const buddy = await createBuddy(user.id, {
    name: "Saved buddy",
    definition: { prompt: "Saved instruction." },
  });
  const before = await readGoldBalance(user.id);
  const response = await send({
    ...REQUEST,
    draft: { ...REQUEST.draft, id: buddy.id },
  });
  expect(response.status).toBe(HTTP_STATUS.ok);
  const result = WORKSHOP_RESULT.parse(await response.json());
  expect(result.text).toContain(REQUEST.draft.prompt);
  expect(result.text).not.toContain("Saved instruction.");
  expect((await getOwnBuddy(user.id, buddy.id))?.definition.prompt).toBe(
    "Saved instruction.",
  );
  expect(await readGoldBalance(user.id)).toBeLessThan(before);
  expect(await listAllChats(user.id)).toEqual([]);
  expect(await listProjects(user.id)).toEqual([]);
});

test("activity openings use the unsaved opening request without changing the activity", async () => {
  const user = await testUser();
  signInAs(user);
  const activity = await createActivity(user.id, {
    name: "Saved activity",
    definition: {
      prompt: "Saved activity prompt",
      openingRequest: "Saved opening",
    },
  });
  const response = await send({
    ...REQUEST,
    draft: {
      ...REQUEST.draft,
      kind: "activity",
      id: activity.id,
      openingRequest: "Workshop opening request.",
    },
    opening: true,
    message: "",
  });
  expect(response.status).toBe(HTTP_STATUS.ok);
  const result = WORKSHOP_RESULT.parse(await response.json());
  expect(result.text).toContain("Workshop opening request.");
  expect(result.openingText).toBe("Workshop opening request.");
  expect(
    (await getOwnActivity(user.id, activity.id))?.definition.openingRequest,
  ).toBe("Saved opening");
});

test("spell selection casts unsaved instructions and keeps the saved spell unchanged", async () => {
  const user = await testUser();
  signInAs(user);
  const spell = await createSpell(user.id, {
    name: "Saved spell",
    definition: {
      prompt: "Saved spell instruction",
      whenToUse: "Saved selection",
    },
  });
  const response = await send({
    ...REQUEST,
    draft: {
      ...REQUEST.draft,
      kind: "spell",
      id: spell.id,
      whenToUse: "Draft selection",
    },
    message: `/mock-cast ${spell.id}`,
  });
  expect(response.status).toBe(HTTP_STATUS.ok);
  const result = WORKSHOP_RESULT.parse(await response.json());
  expect(result.text).toContain(REQUEST.draft.prompt);
  expect(result.casts).toContainEqual({
    id: spell.id,
    name: REQUEST.draft.name,
  });
  expect((await getOwnSpell(user.id, spell.id))?.definition.prompt).toBe(
    "Saved spell instruction",
  );
});

test("forced casting loads draft instructions before the first reply", async () => {
  const user = await testUser();
  signInAs(user);
  const response = await send({
    ...REQUEST,
    draft: {
      ...REQUEST.draft,
      kind: "spell",
      id: "ask-one-question",
      whenToUse: "Draft selection",
    },
    forceCast: true,
  });
  expect(response.status).toBe(HTTP_STATUS.ok);
  const result = WORKSHOP_RESULT.parse(await response.json());
  expect(result.text).toContain(REQUEST.draft.prompt);
  expect(result.casts).toContainEqual({
    id: "ask-one-question",
    name: REQUEST.draft.name,
  });
});

test("another user's draft or companion is not found", async () => {
  const [user, other] = await Promise.all([testUser(), testUser()]);
  signInAs(user);
  const buddy = await createBuddy(other.id, {
    name: "Private buddy",
    definition: { prompt: "Private" },
  });
  const activity = await createActivity(other.id, {
    name: "Private activity",
    definition: { prompt: "Private", openingRequest: "Private" },
  });
  const spell = await createSpell(other.id, {
    name: "Private spell",
    definition: { prompt: "Private", whenToUse: "Private" },
  });
  const responses = await Promise.all([
    send({ ...REQUEST, draft: { ...REQUEST.draft, id: buddy.id } }),
    send({
      ...REQUEST,
      draft: { ...REQUEST.draft, kind: "activity", id: activity.id },
    }),
    send({
      ...REQUEST,
      draft: { ...REQUEST.draft, kind: "spell", id: spell.id },
    }),
    send({ ...REQUEST, buddyId: buddy.id }),
    send({ ...REQUEST, activityId: activity.id }),
  ]);
  expect(responses.map((response) => response.status)).toEqual([
    HTTP_STATUS.notFound,
    HTTP_STATUS.notFound,
    HTTP_STATUS.notFound,
    HTTP_STATUS.notFound,
    HTTP_STATUS.notFound,
  ]);
});

test("out of gold refuses a test without saving a conversation", async () => {
  const user = await testUser();
  signInAs(user);
  await spendAllGold(user);
  const response = await send(REQUEST);
  expect(response.status).toBe(HTTP_STATUS.tooManyRequests);
  expect(await response.text()).toBe("out-of-gold");
  expect(await listAllChats(user.id)).toEqual([]);
});

test("signed-out and malformed requests cannot start tests", async () => {
  signOut();
  expect((await send(REQUEST)).status).toBe(HTTP_STATUS.unauthorized);
  signInAs(await testUser());
  expect((await send({})).status).toBe(HTTP_STATUS.badRequest);
  expect(
    (
      await send({
        ...REQUEST,
        history: [{ role: "system", content: "forged" }],
      })
    ).status,
  ).toBe(HTTP_STATUS.badRequest);
});
