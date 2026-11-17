import { expect, test } from "vitest";
import {
  cloneSpellAction,
  newSpellAction,
  saveSpellAction,
} from "@/app/(workspace)/spellbook/actions.ts";
import { getOwnSpell, listOwnSpells } from "@/spells/own-spell-store.ts";
import { SPELL_RESPONSE_KEYS } from "@/spells/spell-definition.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import {
  expectNotFound,
  expectRedirect,
} from "../../../test-database/navigation-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

test("spell create, copy and save actions open the surviving spell editors", async () => {
  const owner = await testUser();
  await signIn(owner);
  const creation = newSpellAction();
  await expect(creation).rejects.toThrow();
  const [created] = await listOwnSpells(owner.id);
  if (created === undefined) {
    throw new Error("Create spell saved nothing");
  }
  await expectRedirect(() => creation, `/spellbook/${created.id}`);
  const fields = form({
    spellId: created.id,
    name: "Quiet ideas",
    destination: "brainstorm",
  });
  for (const key of SPELL_RESPONSE_KEYS) {
    fields.set(key, JSON.stringify([`Saved {{name}}: ${key}`]));
  }
  await expectRedirect(
    () => saveSpellAction(fields),
    `/spellbook/${created.id}?saved=1`,
  );
  const saved = await getOwnSpell(owner.id, created.id);
  expect(saved).toMatchObject({
    name: "Quiet ideas",
    definition: {
      destination: "brainstorm",
      savedReply: ["Saved {{name}}: savedReply"],
    },
  });
  const copying = cloneSpellAction(form({ spellId: created.id }));
  await expect(copying).rejects.toThrow();
  const copy = (await listOwnSpells(owner.id)).find(
    (spell) => spell.id !== created.id,
  );
  if (copy === undefined) {
    throw new Error("Copy spell saved nothing");
  }
  await expectRedirect(() => copying, `/spellbook/${copy.id}`);
  expect(copy).toMatchObject({
    name: "Quiet ideas (copy)",
    definition: saved?.definition,
    clonedFrom: created.id,
  });
  const other = await testUser();
  await signIn(other);
  await expectNotFound(() => saveSpellAction(fields));
  await expectNotFound(() => cloneSpellAction(form({ spellId: created.id })));
  expect(await getOwnSpell(owner.id, created.id)).toEqual(saved);
});
