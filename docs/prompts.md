# Prompts

A construct, activity or spell has a prompt. The editor for an own construct shows one prompt describing its voice and habits. Headings can organize those instructions without making them separate fields. The Visual description is a separate field for appearance and identity. It never enters the conversational prompt. Built-in definitions show their original Visual description and artwork read-only; Make a copy makes an editable copy with the same images.

Visual descriptions share Save, browser draft recovery and Cancel with the prompt. Reset prompt preserves the description and images. A saved description with images cannot be cleared; the field explains this before submission. Save accepts description text, while image references and framing stay server-controlled.

An activity has a prompt and a separate opening request. The prompt guides the current activity session. The opening request asks for the first reply when no prepared opening exists. Reset restores the activity prompt while preserving its opening request.

A spell has a prompt, shown as Instructions, and separate name and when-to-use metadata. The model sees selection metadata before casting. Casting delivers the instructions through the tool result. Reset restores instructions while preserving the name and when-to-use description.

Reset changes the editor draft and offers Undo reset; only Save stores it. Unsaved names, opening requests and when-to-use descriptions are preserved. Reset restores the prompt from the built-in source when there is one. Otherwise a construct uses the default construct's prompt, an activity uses Chat's prompt, and a spell uses its starter instructions. Renaming and resetting never alter existing adventure snapshots or past casts. A copy that still matches a built-in definition retains its prepared opening.

Built-in and starter prompts begin with `# Character Sheet` for a construct, `# Activity Sheet` for an activity, and `# Spell Sheet` for a spell. The separate name field identifies the definition; the sheet contains its instructions. Renaming does not require a heading edit. Identity instructions such as “Write as Vellum” still describe the character and remain editable. For example, a construct named “My cartographer” can keep `# Character Sheet` while its body describes its voice. Character Sheet is a prompt heading, not a rename of constructs. Make a copy and reset use these same sheets. Model context identifies the current activity by its snapshot name beside its instructions; that label is not saved in the prompt.

## Workshop

Construct, activity and spell detail pages share the Workshop. In the single Workshop collection, choose Create construct, Create activity or Create spell to create an own definition without copying another. The saved starter names remain "New construct", "New activity" and "New spell".

Make a copy opens a new private copy in the same editor, for built-ins and private definitions alike. Edit opens an existing private definition. Save stores edits; Cancel puts back saved fields and clears the browser draft. Reset and retirement remain available. Workshop actions never start quests. The editor uses the available width and shows one instruction section at a time. Save stays pinned at the foot of the form, with Reset and Cancel after it.

The Workshop has no test drawer. Saving prompt text makes no model call and spends no batteries. Construct artwork keeps its explicit generation actions and battery rules below. To try a change, save it and use the definition in a quest or in Chat. A conversation keeps the construct and activity texts it started with, so an edit shows in conversations started after it, and a spell's next cast reads its saved instructions.

## Construct images

The Workshop previews avatar, portrait, opening and working appearances. Missing art uses initials. Generate Images uses one canonical generation with framing reused across roles; working art uses that image unless a separate variant exists. Images use the construct’s authorized destination, so private art is never loaded through a public asset URL.

Save stores the current name, conversational prompt and Visual description. It attaches matching draft artwork without another charge. Otherwise it requests replacement artwork when the validated Visual description differs from the persisted description, including adding a first nonempty description. Comparison happens under the source row’s lock, after trimming and normalizing line endings. Unchanged saves, name or voice edits and editing then restoring the description do not generate or reserve batteries. Text-only form submissions omit the unchanged description, preserving a newer appearance saved by another tab. Generate Images is a separate explicit intention: it uses the current draft Visual description, including recovered browser drafts, without saving the name, prompt or description, even when unchanged. The Save label and adjacent accessible explanation distinguish these outcomes and show the reservation before a paid request.

The image provider receives exactly the normalized Visual description as its sole argument. No construct name, conversational text, voice, habits, reference bytes or synthesized creative instructions are sent. Square output settings remain provider parameters; avatar and other framing remain app metadata. A spinner and accessible status show paid work; text-only saves do not announce image generation.

A durable request UUID is kept before submission. While generation is pending, repeated generation and description-changing saves are disabled. Text-only saves remain available and retain the unresolved request UUID and payload. Check generation status makes a read-only request; reloading recovers pending work without starting another paid generation. A lost response keeps the request unresolved until its status can be read. If the service confirms that the accessible construct has no claim for that request, Resume original request explicitly sends the same UUID and saved payload. It never allocates a second UUID for unresolved work. An inaccessible construct is a different HTTP result and cannot be resumed. Retry after a known terminal failure creates a new UUID and may spend batteries. The page shows per-role states, unavailable generation, lack of batteries, failure and stale results. Successful images replace the previews without resetting the editor. Failure or stale results preserve good old images and drafts.

A versioned service fingerprint depends only on the normalized Visual description. Name and conversational edits neither stale artwork nor invalidate a pending completion. Completion locks and re-reads the active source, attaches artwork while preserving its latest saved text, and rejects a saved description changed since the request began or an unavailable source.

Draft artwork, including artwork from a first unsaved description, lives in a separate generation snapshot carrying its nonempty submitted description. The saved definition stays unchanged until explicit Save attaches matching artwork and description without another generation charge. Owner-scoped grants allow preview and recovery; freshness compares the artwork source with the current editor draft. Restore previous artwork restores saved artwork; draft artwork enters that recovery history after Save. A Save submission superseded by another tab before claim reserves no batteries.

For older unversioned hashes, an owned immutable generation record supplies the original description when available; otherwise freshness is shown as unknown. Reading freshness changes no text, metadata, paid history or batteries.

## Activity action names

Activities uses each activity’s name directly as its start action. The built-in names are Brainstorm, Chat and Break Down a Project. These names also appear in activity choices and detail page titles. Own activity names are kept as written.

The rename changes display names only. Built-in instruction text (including older headings), opening requests and ids stay unchanged so exact built-in matching and prepared openings remain compatible. In particular, Chat retains `open-chat`. Saved names, prompts, adventure snapshots and historical content are not rewritten.

## Storage compatibility

The product calls ongoing work quests, conversations adventures and persistent quest context the Journal. Existing `chat` and `memory` paths, identifiers, tool names and prompt boundary tags remain compatible. Historical Note paragraphs remain ordinary Journal text and are never rewritten by feature removal. The global prompt explains earlier names without rewriting user instructions or saved snapshots. Existing route paths, tool names, storage fields and built-in activity ids retain their `project` names for compatibility. Saved user prompts, adventure snapshots and past messages keep their original text.

The shared store handles ownership, cloning and source tracking. Copies bought in the removed Marketplace are ordinary own definitions; their inert `bought_from` column is no longer read. Domain definitions contain concrete prompt and metadata fields. There is no registry of editable prompt parts.

The existing `buddies` table and JSON columns remain in place. Validated read boundaries convert legacy construct voice and habits into one prompt, preserving the previous rendered text. Activity and spell boundaries separate their instruction text from opening requests and selection metadata. Writes retain the legacy JSON shape so the currently live build can read newly saved definitions, snapshots and listings during a rollout or rollback. This change needs no schema migration.

Constructs were first called buddies. The rename to constructs changed no schema, and the earlier build, which a release keeps live while it migrates and a rollback returns to, reads everything the current build writes:

- Stored rows and browsers' saved drafts keep the kind `buddy` (`STORED_PROMPT_KIND` in `src/prompts/prompt.ts`), and Journal a construct writes keeps the author `buddy` (`STORED_MEMORY_AUTHORS` in `src/memory/memory.ts`). The stored kind's parser also takes `construct`; the stored Journal author is a legacy-only boundary, `user` or `buddy`, and refuses `construct`, as the `memory_versions` check does.
- `/buddies`, `/buddies/<id>`, `/guild` and `/guild/<id>` redirect, temporarily, to `/constructs` and `/constructs/<id>` (`next.config.ts`).
- An own copy of a built-in construct, activity or spell is stored, while its whole text is unchanged, in that built-in's text from before the rename, and read back in today's text (`src/prompts/earlier-built-in-texts.ts`). The earlier texts are recorded in `src/prompts/earlier-built-ins.ts` and never edited. The earlier build knows a copy only by exact equality with its own text, so either build keeps the copy's prepared openings, whichever build saved it. Edited text is stored exactly as written, and matching stays exact (`src/prompts/matching-built-in.ts`). Adventure snapshots and activity sessions are not translated.
- Generic sheet headings follow the same exact-match rule. `src/prompts/named-sheet-built-ins.ts` records the canonical definitions immediately before the heading change. Existing unchanged copies read as current sheets, including Find something to make, while writes keep the oldest recorded compatible text. Edited copies, including those with changed opening requests or when-to-use metadata, keep their text exactly. The historical records are never rewritten. No database migration or bulk prompt rewrite is needed.
- `BUDDY_MODEL` is read when `CONSTRUCT_MODEL` is unset (`readConstructModel` in `src/env.ts`).
- The global prompt tells the model that older instructions may call a construct a buddy. Saved prompts and snapshots are never rewritten.

What the earlier build cannot do after a rollback: open `/constructs` links.

Placeholders remain literal in saved definitions and snapshots. Substitution happens when text enters model context. Adventure viewers cannot read private spell instructions through saved tool results, and ownership of the original definition does not change team adventure access.

Reply and tool application state identifies the acting user. Replies, generated images and automatic adventure names charge that user; and generated openings charge the starter. Prompt text grants no access or tools.

## Unsaved edits

The shared editor refuses a blank or whitespace-only name beside the field and keeps all edits. Unsaved edits are kept in this browser for the signed-in viewer and prompt until Save or Cancel. A draft based on an older save is discarded. Browser storage can be blocked or cleared; these drafts do not follow you to other devices. Anyone with access to this browser’s storage can read them, so use Cancel on a shared device.

## Quest activities and Journal updates

New quests can start with any activity and construct chosen in an adventure form. The quest creation form defaults to Break Down a Project and its saved New quest construct preference. Quest interview is no longer listed; existing interview snapshots remain readable and older links or activity requests lead to Break Down a Project.

Every quest adventure receives Journal update instructions and the update tool, including when the Journal is empty. Constructs save useful user information and agreed plans without requiring an interview. Empty `oldText` initializes or appends Markdown; replacements preserve unrelated content. Standalone adventures have no Journal. Mock tests verify tool availability, persistence and shared context; whether the model chooses to save information unprompted needs a real-model check.

## Definition page identity

Construct, activity and spell detail pages use the actual definition name as their H1 and document title. Access checks precede private names in metadata. Workshop remains secondary navigation and context. Definition names open inspection or editing; collections have no quest-start action. Make a copy creates a private definition, while Edit changes an existing private definition in place.
