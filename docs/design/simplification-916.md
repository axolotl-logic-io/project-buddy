# Workshop collection contract

Workshop is the single collection destination for built-in and private constructs,
activities and spells. The former Constructs and Spellbook collection URLs redirect
to the relevant Workshop section. Existing detail and editor URLs may remain thin
adapters; collection metadata never contains private definition names.

Keep built-in inspection and Make a copy, private prompt editing and draft recovery,
reset and copying, construct visuals, quest-start choices, spell casting and activity
instructions. Retirement, restore and permanent deletion remain available. Retired
definitions stay out of active choices. Built-in instructions remain protected.

Reuse Workshop's existing editing experience. Remove duplicate collections and
collection start actions without restoring Activities, Marketplace or temporary
Workshop testing removed by the other simplification tickets. Preserve owner
boundaries, saved snapshots and model tools. No schema migration is needed.

## Customization actions

Create construct, Create activity and Create spell start from private starter
instructions. Make a copy works for built-in and private definitions and opens
the new copy’s editor. New copies use the source name with " (copy)" appended;
existing names, saved prompt text and conversation snapshots are unchanged.
Edit opens a private definition, Save stores changes, and Cancel restores saved
fields and clears the local draft. Retire, restore, delete and reset remain.
Workshop actions never start quests. Quest creation stays in Start Quest and
Turn Chat into a quest; choosing a construct belongs inside Start Quest.
