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

## Storage and historical definitions

The shared `own_prompts` table stores constructs, activities and spells by their domain kinds. Conversation snapshots use `construct_id`, `construct_name` and `construct_parts`. The [nomenclature cutover](quest-nomenclature.md#release-cutover) transfers existing rows and requires the matching database and build.

Validated read boundaries convert historical construct voice and habits into one prompt, preserving rendered text. Activity and spell boundaries separate instructions from opening requests and selection metadata. The JSON codecs continue to handle those shapes; new copies store current prompt wording rather than an older built-in definition.

Exact matches to historical built-in definitions read as current definitions, preserving prepared openings. Historical records in `src/prompts/earlier-built-ins.ts` and `src/prompts/named-sheet-built-ins.ts` support that recognition. Edited prompts and snapshots retain their text.

`CONSTRUCT_MODEL` selects the model. The earlier model setting and collection redirects have been removed. Browser prompt drafts transfer their earlier construct-kind key when recovered.

Placeholders remain literal in saved definitions and snapshots. Substitution happens when text enters model context. Adventure viewers cannot read private spell instructions through saved tool results, and ownership of the original definition does not change team adventure access.

Reply and tool application state identifies the acting user. Replies, generated images and automatic adventure names charge that user; and generated openings charge the starter. Prompt text grants no access or tools.

## Unsaved edits

The shared editor refuses a blank or whitespace-only name beside the field and keeps all edits. Unsaved edits are kept in this browser for the signed-in viewer and prompt until Save or Cancel. A draft based on an older save is discarded. Browser storage can be blocked or cleared; these drafts do not follow you to other devices. Anyone with access to this browser’s storage can read them, so use Cancel on a shared device.

## Quest activities and Plan updates

Every quest reply receives the current Plan and recent conversation. The `change_plan` tool keeps agreed tasks; direct controls and Plan commands make changes without a model call. Goal, Preferences, Journal notes and their update tools are removed. A new quest starts with an empty Plan. Optional starting context is saved as a user message before the construct’s opening.
