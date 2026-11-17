import { and, eq } from "drizzle-orm";
import { expect, test } from "vitest";
import ConstructPage from "@/app/(workspace)/constructs/[constructId]/page.tsx";
import {
  cloneSpellAction,
  retireSpellAction,
  saveSpellAction,
} from "@/app/(workspace)/spellbook/actions.ts";
import { GET as getConstruct } from "@/app/api/v1/constructs/[constructId]/route.ts";
import { GET as listConstructs } from "@/app/api/v1/constructs/route.ts";
import { createChat } from "@/chats/new-chat-store.ts";
import { getChat } from "@/chats/store.ts";
import { DEFAULT_CONSTRUCT_ID } from "@/constructs/index.ts";
import { getDb } from "@/db/client.ts";
import { ownPrompts } from "@/db/tables/own-prompts.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { SPELL_RESPONSE_KEYS } from "@/spells/spell-definition.ts";
import { testData } from "../../support/test-database/data-test-kit.ts";
import { createConstruct } from "../../support/test-database/historical-construct-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { callApi } from "../api/api-test-kit.ts";
import { expectNotFound } from "../test-database/navigation-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

test("custom construct pages and API reads are unavailable while existing quests keep snapshots", async () => {
  const owner = await testUser();
  const construct = await createConstruct(owner.id, {
    name: "Historical owl",
    definition: {
      prompt: "Historical instructions",
      visual: { version: 1, description: "A small brass owl." },
    },
  });
  const quest = await testData(owner).quest();
  const chat = await createChat(owner.id, {
    quest,
    construct: {
      id: DEFAULT_CONSTRUCT_ID,
      name: construct.name,
      definition: construct.definition,
    },
  });
  await signIn(owner);
  await expectNotFound(() =>
    ConstructPage({
      params: Promise.resolve({ constructId: construct.id }),
      searchParams: Promise.resolve({}),
    }),
  );
  expect(
    (await callApi(getConstruct, { params: { constructId: construct.id } }))
      .status,
  ).toBe(HTTP_STATUS.notFound);
  expect((await callApi(listConstructs, { params: {} })).body).toMatchObject({
    items: [
      expect.objectContaining({ id: "vellum", builtIn: true }),
      expect.objectContaining({ id: "lumen", builtIn: true }),
    ],
  });
  expect(
    (await callApi(getConstruct, { params: { constructId: "lumen" } })).status,
  ).toBe(HTTP_STATUS.ok);
  expect(
    await ConstructPage({
      params: Promise.resolve({ constructId: "lumen" }),
      searchParams: Promise.resolve({}),
    }),
  ).toBeDefined();
  expect((await getChat(owner.id, chat.id))?.construct).toEqual({
    name: construct.name,
    definition: construct.definition,
  });
  const forged = new FormData();
  forged.set("spellId", construct.id);
  forged.set("name", "Forged spell edit");
  forged.set("destination", "tasks");
  for (const key of SPELL_RESPONSE_KEYS) {
    forged.set(key, JSON.stringify(["A valid reply"]));
  }
  await expectNotFound(() => cloneSpellAction(forged));
  await expectNotFound(() => saveSpellAction(forged));
  await expectNotFound(() => retireSpellAction(forged));
  const [row] = await getDb()
    .select()
    .from(ownPrompts)
    .where(
      and(eq(ownPrompts.userId, owner.id), eq(ownPrompts.id, construct.id)),
    );
  expect(row).toMatchObject({
    name: construct.name,
    retiredAt: null,
    kind: "construct",
  });
});
