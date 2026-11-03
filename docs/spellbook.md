# Spellbook

Each user has a Spellbook: their list of spells. A spell is a set of instructions that the buddy loads only when it needs them, as a skill is in agentic coding. Every chat's instructions list the user's spells by name and when-to-use line, so a spell's instructions cost tokens only in the chats that cast it. The [glossary](../GLOSSARY.md#spell) defines the words this page uses.

## Spells

A spell is a [prompt](../GLOSSARY.md#prompt), like a buddy or an activity, with two parts (`SpellParts` in `src/spells/spell.ts`):

- **When to use:** one line that tells the buddy when to cast the spell. Every chat's instructions carry it, so it is at most 300 characters.
- **Instructions:** what the buddy does once it casts the spell, at most 20,000 characters.

Any `{{name}}` in either part becomes the user's name: in the when-to-use line in the buddy's list, and in the instructions a cast gives. The stored parts keep it as written. The buddy's list puts each spell on one line, with each run of white space as one space, so a line break or a heading in a when-to-use line can't break out of the list.

A spell's name is at most 80 characters. The spell page's fields say each limit and keep typing within it, and the server refuses a save that is longer (`saveSpellAction` in `src/app/(workspace)/spellbook/actions.ts`). The store keeps to the same limits on every write: the spell kind gives the shared store its limits (`PromptLimits` in `src/prompts/own-prompt-store.ts`), and a write beyond them throws, saving nothing. A clone's name is its source's with " (clone)" after, cut short so it fits.

The site ships built-in spells (`src/spells/index.ts`), which are read-only. The first is "Ask one question at a time" (`ask-one-question`), which interviews the user step by step. Built-in spell ids are stable, since past casts and own spells' `cloned_from` name them.

A spell grants no tools, as an activity doesn't. Every chat has the same tools; a spell's instructions may only say how to use them.

## Spellbook pages

The Spellbook page, `/spellbook`, is in the site menu after Buddies and Activities. It lists the built-in spells, each with Customize, and the user's own spells, oldest first, each with Tweak, Clone and Delete. Delete asks first. New spell writes a spell from scratch, named "New spell", whose parts are the starter text a part of it resets to.

Each spell has its own page, `/spellbook/SPELL_ID`, where `SPELL_ID` is the spell's id. A built-in spell's page shows its parts as read-only Markdown, with Customize. An own spell's page is a form for its name and parts, with a Reset button for each part and Delete. A part resets to the built-in spell it was customized from, or to the starter text for any other spell.

## Casting a spell

Every chat's system prompt lists the user's spells, built in and own, in a "Spells" section after the activities (`spellsSection` in `src/replies/system-prompt.ts`). Each line gives the spell's id, its name and its when-to-use line. In a team project's chat, the list is the replying user's.

The list sits in the system prompt's shared part, which is cached across one user's chats. It depends only on the user's spells, so the global prompt stays the same for every user, and the cached part changes only when the user changes a spell.

When a spell's when-to-use line fits, the buddy calls the `cast_spell` tool with the spell's id (`src/spells/cast-spell.ts`). The result is the spell's name and instructions as they are at the cast. The chat shows "Cast SPELL NAME" where the call arrived. Casting makes no model call and changes nothing, so it needs no quota check.

An id that is not one of the user's spells, such as an unknown id or another user's spell, casts nothing. The result says so, and tells the buddy to cast only the spells its instructions list. The chat shows nothing for it.

## Past casts

The saved reply keeps the cast's result, instructions included, so the buddy reads them in later replies of that chat. Editing or deleting the spell later changes no past chat, as a [snapshot](../GLOSSARY.md#snapshot) would.

The message store has two reads (`src/chats/store.ts`). A reply reads the chat with `listMessagesForModel`, which keeps each cast's instructions. Everything people see, such as the chat's page, reads `listMessages`, which leaves them out (`withoutSpellInstructions` in `src/spells/cast-spell-contract.ts`). In a [team project](team-projects.md), a member's own spell therefore steers the chat's later replies, whoever writes them, but reaches no one else's browser.

## Storage

Own spells live in the own prompts table, `buddies`, with `kind = 'spell'`, beside own buddies and activities. The shared store `src/prompts/own-prompt-store.ts` reads and writes them for their owner alone, and `src/spells/spell-store.ts` gives the spell kind its own functions. Another user's spell, or a prompt of another kind, is not found.

Migration 0030 widens the `buddies_kind_known` check to allow `'spell'`. It is an additive migration: the live build never writes `'spell'` and reads own prompts by kind, so it keeps working on the new schema.

## Mock buddy

In tests, `/mock-cast SPELL_ID` makes the mock buddy cast the spell, then reply with the instructions the cast gave, or with why it cast none (`src/replies/mock-cast.ts`).
