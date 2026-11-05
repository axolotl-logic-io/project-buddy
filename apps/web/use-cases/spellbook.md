# Spellbook

The conventions for these cases are in [the index](README.md#conventions).

A spell is a set of instructions the construct loads only when it needs them. Each spell has a name, a when-to-use line and instructions. Every adventure's instructions list her spells by name and when-to-use line, and the construct casts a spell when it fits, which gives it the spell's instructions. The site has two built-in spells:

- **Ask one question at a time:** the construct interviews her step by step, one short question per message.
- **Blender manual lookup:** the construct looks up Blender facts in the Blender manual and cites the sections it read (see [`use_case_ask_blender_question`](chats.md#use_case_ask_blender_question)).

## use_case_construct_casts_spell

The construct casts one of her spells when it fits what she needs.

- **Prerequisites:** [`use_case_send_message`](chats.md#use_case_send_message).
- **Steps:**
  - In an adventure, she asks for help with something the construct needs several details about first.
  - Later, she edits one of her own spells that the construct cast earlier in the adventure.
  - In a team quest's adventure, she writes while another person in the quest has spells of their own.
- **Outcome:** the construct casts Ask one question at a time, and its reply follows the spell's instructions *(checked by the real-Claude smoke test)*. The adventure shows "Cast Ask one question at a time" where the cast happened, including after reopening the adventure. Every adventure's instructions list her spells, built in and her own, by name and when-to-use line, but never their instructions and never another user's spells. A past cast keeps the instructions the spell had then, so her edit changes only later casts. In a team quest's adventure, the construct's list is the spells of whoever wrote the message it answers, and the adventure's page sends no one the instructions of a cast spell. An id that isn't one of her spells casts nothing, and the construct is told so.
- **Next:**
  - `use_case_customize_spell`: make a spell of her own.

## use_case_customize_spell

The user makes a spell of her own from a built-in one, and changes it.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - She opens Spellbook from any signed-in page's menu. It lists the built-in spells, each with its when-to-use line, then her own.
  - She chooses Customize beside Ask one question at a time. The site makes a spell of hers named "Ask one question at a time (clone)" and opens its page.
  - She renames it and edits its when-to-use line and instructions, and saves. Each field says how long it may be: the name 80 characters, the when-to-use line 300 and the instructions 20,000.
  - Back on the Spellbook, she clones it. On its page, she resets the prompt, then saves it.
  - She retires the first spell.
- **Outcome:** resetting instructions preserves the name and when-to-use description. Existing casts keep their instructions after edits or deletion. Her spell has her name and text, and the construct's list of spells shows them. The clone is named as its source with " (clone)" after, with the same text. Resetting instructions goes back to the built-in spell's text. Retire removes it from her active Spellbook and future casts, while Retirement preserves it for restoration. A name, when-to-use description or prompt longer than its limit is refused and saves nothing. The built-in spells never change. Her spells are hers alone: another user's spell is not found.
- **Variations:**
  - Bought copies and clones of bought copies have no built-in instructions to restore. Their pages explain this and offer no reset; a direct reset request is refused without changing their instructions. For other copies, Reset changes only the draft prompt. Undo reset restores its previous text; Save commits the changes. Reset preserves the name, an activity’s opening request and a spell’s when-to-use description.
- **Next:**
  - `use_case_construct_casts_spell`: have the construct cast it.
  - `use_case_new_spell`: write a spell of her own from scratch.

## use_case_new_spell

The user writes a spell of her own from scratch.

- **Prerequisites:** [`use_case_sign_in_by_link`](accounts.md#use_case_sign_in_by_link).
- **Steps:**
  - On the Spellbook, she chooses New spell. The site makes a new spell of hers and opens its page to edit.
  - She names it, writes its when-to-use line and instructions, and saves.
  - She resets the prompt and confirms when asked, then has the construct cast the spell in an adventure.
- **Outcome:** the new spell is named "New spell" and starts with starter instructions and when-to-use text that tell the construct the spell isn't written yet. The Spellbook lists it with her own, and it works as any spell of hers does: she can tweak, rename, clone and retire it, and the construct lists and casts it. Choosing New spell again makes another spell named "New spell". Another user never sees it.
- **Next:**
  - `use_case_construct_casts_spell`: have the construct cast it.
