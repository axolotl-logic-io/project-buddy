# Construct visuals

Image generation and its Workshop controls have been removed. `look` shows the Visual description in the conversation’s saved construct. The generation sections below document retained storage and historical behavior; they do not describe available controls.


Issue [#735](https://github.com/axolotl-logic-io/project-buddy/issues/735) establishes the shared contract for generation, Workshop, adventures and construct selection. Screen integrations and generated-asset delivery are implemented through epic #734; [Images](images.md) describes generation and operations.

## Metadata and identity

`apps/web/src/constructs/visual.ts` exports the Zod schemas `CONSTRUCT_VISUAL`, `VISUAL_ASSET`, `VISUAL_FRAME` and `VISUAL_ROLE`, and their types `ConstructVisual`, `VisualAsset`, `VisualFrame` and `VisualRole`. `ResolvedConstructVisual` describes the resolver result.

`ConstructDefinition.visual` is optional. Version 1 contains a visual `description`, an optional `canonical` asset, an optional `working` asset, and optional `frames` for `avatar`, `portrait`, `opening` and `working`. Each frame specifies normalized image coordinates `x`, `y` at the frame center and `size` as a fraction of the square image's width. Assets must be square; the renderer clips the frame to its square container. Missing frames use the whole image. Missing working art uses canonical art. One canonical generation is sufficient; no caller should require four paid generations.

A built-in reference is `{ kind: "built-in", artwork: "lumen-v1" }` or `vellum-v1`. A generated reference is `{ kind: "generated", assetId: UUID }`. References contain no owner, source construct, provider URL, storage key or expiring signature. A UUID identifies immutable bytes, never an editable slot. Replacing art allocates a new UUID.

`resolveConstructVisual(construct, role)` accepts a name and definition and returns `asset`, `frame`, `initials` and `description`. It never infers artwork from names, prompt matching or ids. Own constructs can carry the default built-in id in adventure compatibility paths. Missing metadata, old own snapshots and custom constructs use initials. Actual built-ins carry explicit metadata, as do new clones of them. Old snapshots with no metadata retain their fallback; snapshots are not backfilled from today's source construct.

`constructVisualSource(asset, destination?)` returns the versioned repository path for built-in assets. A generated reference needs an explicit `VisualDestination`: `{ kind: "construct" | "adventure", id: UUID }`, validated by `VISUAL_DESTINATION`. It resolves to `/api/constructs/visuals/<kind>/<destination id>/<asset id>`. Without a valid destination it returns `undefined`. The delivery service must authorize that destination on every request; the path alone grants no access. Failed image delivery shows initials. Do not bypass this with a gallery URL or a source-owner endpoint.

The built-in `description` values are the user-supplied texts, stored verbatim in `src/constructs/lumen.ts` and `vellum.ts`. Generation must use those values as its canonical visual descriptions. Role framing is separate metadata and must preserve character identity and the reference artwork.

## Shared primitives

`apps/web/src/components/constructs/construct-visual.tsx` exports:

- `ConstructAvatar` and `ConstructAvatarProps`: `construct: ConstructSnapshot`, optional `size: 32 | 40` (default 40), optional `decorative: boolean`.
- `ConstructIllustration` and `ConstructIllustrationProps`: `construct: ConstructSnapshot`, `visualRole: VisualRole`, optional `decorative: boolean`. The parent sets the illustration width; the square fits within it.

The props types are exported from `src/components/constructs/construct-visual-props.ts`. Both primitives accept an optional `destination: VisualDestination` for generated artwork. Pass the current construct or adventure destination, rather than the private source construct.

Both expose the construct name as the accessible image name. Set `decorative` beside an already visible name. Missing or failed images show initials. The primitives have no animation, status announcement or interactive behavior. The shared classes live in `src/app/page-roles.css` and use semantic tokens. Downstream owners compose links, status copy and layout around these primitives.

```tsx
<ConstructAvatar construct={snapshot} size={32} decorative={true} />
<ConstructIllustration construct={snapshot} visualRole="opening" />
```

The supplied avatar frames focus on Lumen's smiling light and Vellum's brass face at small sizes. Other roles retain the supplied composition.

## Avatar framing of generated artwork

Generated artwork gets its `avatar` frame from the image when it is generated, so a 40 px avatar shows the character's head rather than a fixed slice of the sheet. Built-in artwork keeps its hand-chosen frames and is never framed this way.

`apps/web/src/constructs/avatar-frame.ts` owns the framing. After the image provider returns the canonical image and the service decodes it, `complete` in `visual-generation.ts` asks the framer before it opens its transaction. The framer sends a 512 px copy of the image, and a fixed question, to Claude Haiku through the AI SDK. The model returns two boxes as fractions of the image: the character's face, and its whole head, including anything on it such as hair, ears, a hat or leaves. For a character whose body is its head, the head box is the whole body.

`frameAroundHead` turns the boxes into the frame. It centres the frame on the box that holds both, makes it 1.2 times that box's larger side, at least a fifth of the image, and moves it to stay inside the image. Only `avatar` is set; `portrait`, `opening` and `working` keep the whole image.

The framer never fails a generation. Under the mock model, without Claude's credential, or when the call fails or returns no usable head box, the avatar keeps the centre frame `{ x: 0.5, y: 0.5, size: 0.5 }`, as generated artwork had before. The framing model sees only the generated picture: no name, Visual description, prompt or reference image.

The frame is stored in the visual metadata like any other, so snapshots, clones, bought copies, draft artwork and previous-artwork recovery carry it unchanged. Framing never re-runs on existing artwork. A later refinement could let the owner nudge the frame in the Workshop.

## Storage and snapshots

The existing JSON definition fields store metadata with the prompt; no schema migration is needed. `parseConstructDefinition` accepts current prompt and legacy voice/habits forms. Invalid or future visual metadata is ignored without losing valid conversational text. `storedConstructPrompt` writes the legacy-compatible voice/habits form plus visual metadata. Older readers ignore the new property; older writers can drop it during rollback. Re-save art after such a rollback if necessary.

Own construct stores, clones and adventure snapshots all use these shared serializers. Compatibility text translation preserves the caller's visual metadata and only translates the prompt. Prepared-opening and unchanged-built-in checks compare conversational text only. System prompts read `definition.prompt`; visual descriptions must never be appended to conversational prompts. Prompt forms and prompt resets retain the saved visual metadata.

Snapshots copy the visual description, immutable references and framing into the adventure definition. Editing a source doesn't change existing adventure snapshots. Clones and bought copies retain the same immutable references, without retaining private source access.

## Generated-asset service contract

`src/constructs/visual-generation-contract.ts` defines the request and response boundaries for the service. It exports `VISUAL_GENERATION_REQUEST`, `VISUAL_GENERATION_RESULT`, `VISUAL_GENERATION_QUOTE`, `VISUAL_GENERATION_STATUS` and `VISUAL_ROLE_STATE`, with inferred types. A request contains a construct UUID, a durable request UUID and the normalized draft Visual description. A result contains its status, battery reservation, per-role states and optional visual metadata. A read-only quote contains the reservation, provider availability, outdated status, optional pending request UUID with its immutable description, and optional result and latest still-granted draft artwork with its source description. These schemas add no endpoint or paid call by themselves.

New visual metadata carries `sourceFingerprint`, a SHA-256 digest of the normalized Visual description only, and `sourceFingerprintVersion: 2`. The provider receives that exact description alone: no name, conversational instructions, reference image or creative wrapper. Name and voice edits do not stale artwork.

For older unversioned hashes, the service compares an owned immutable generation record’s description when one is available; other legacy artwork reports unknown freshness. Existing text and paid history are never rewritten to infer a baseline.

The implemented service follows these requirements. `src/constructs/visual-generation.ts` owns generation; `visual-asset-store.ts` owns immutable bytes and grants, and the resource-scoped API routes authorize delivery.

1. Generate through the swappable image provider and battery accounting, with one canonical image by default. Validate/decode raster bytes, enforce size limits and persist immutable bytes before attaching metadata. Never persist provider URLs, SVG or user-supplied remote URLs as an asset reference.
2. An owner-scoped attachment operation takes the acting user first and validates their access to the destination construct and every generated reference, including a working variant. Parsing metadata establishes shape, not authorization. Never accept an arbitrary asset UUID as proof of ownership. The generation service must attach through this operation, not generic untrusted definition writes.
3. Separate immutable bytes from grants. A construct grant belongs to its owner. Creating an adventure must atomically create grants for every referenced asset and persist the snapshot. Cloning must similarly grant the destination access before returning success. This permits snapshots and bought copies to outlive private sources without exposing source ids or owners.
4. Delivery takes the acting user, destination kind (`construct` or `adventure`), destination id and asset id. Resolve access using the existing owner/open-to predicates, then confirm that exact destination snapshot references the asset. A quest's owner reads through their adventure grant, never through the author's construct grant. Foreign or unreferenced ids read as not found. Do not introduce a public asset-id-only endpoint.
5. Extend `constructVisualSource` and the primitives together with an explicit authorized destination context. Return same-origin resource-scoped paths; recheck access on every request. Use private cache policy, no shared optimizer cache and no persistent signed URL in JSON. Do not enable generated images until real-database tests cover owner/outsider isolation and revoked access.
6. Deleting a source releases only its grant. Retirement retains grants. Existing snapshots, clones and bought copies retain their grants. Garbage-collect bytes only after the last reference/grant is gone; retries and deletes are idempotent. Adventure image-gallery cascades must not delete construct artwork. A failed generation or attachment leaves no partial metadata; reclaim unattached bytes separately.

The generation service owns byte storage, grants, delivery authorization and collection. The shared metadata module owns the metadata and resolution contract. Downstream UI owners use the exported primitives and do not add parallel role models. Generated delivery uses additive migrations and transaction coverage for the grant-creation paths above.

## Artwork source

`apps/web/public/constructs/lumen-v1.png` and `vellum-v1.png` are the unmodified reference PNGs supplied by the requesting repository owner for #735 on 2026-11-05. No new art was generated for #735. No independent artist or license information accompanied the files; do not invent attribution. Runtime uses committed paths, never local attachment paths. Keep these versioned files immutable; new art receives a new versioned path.

## Discovery and character profiles

The construct picker pairs saved artwork with a visible name, personality copy and a brief sample line. The Constructs list uses the same shared portrait primitive. Own-choice reads send only id, name and visual metadata to the picker, without conversational instructions.

`components/constructs/adventure-character-header.tsx` exports `AdventureCharacterHeader`. The caller supplies the adventure's `construct` snapshot and optional `destination: VisualDestination` from the shared service contract. Adventures pass `{ kind: "adventure", id: chat.id }`; own picker and list portraits pass their construct destination. The component forwards it to both shared art primitives. The control opens a keyboard-accessible, scrollable profile and returns focus when closed. The adventure header uses `compact={true}` to place the portrait beside the existing named heading without another row. Its accessible button name still identifies the construct.

Public built-in personality copy requires explicit built-in canonical artwork metadata and unchanged built-in conversational instructions. Changed instructions and picker choices without conversational text use generic own-construct copy. Names and source ids never infer identity. Own snapshots without that metadata use generic public copy; neither private prompt text nor Visual description instructions are shown. Selection and profile opening make no model calls.

## Previous artwork recovery

A saved replacement retains one previous image identity on the own construct. Restore previous artwork restores that image and its saved Visual description, preserving current name and prompt. It uses existing bytes, makes no model call, and charges no batteries. The editor requires other changes to be saved or discarded first. Pending generation blocks restoration. A new saved replacement replaces the recovery slot.

Generated identity metadata comes from the recorded generation when available, including artwork legitimately held through a bought copy. Unknown legacy freshness remains unknown. Missing artwork never gets a fabricated recovery entry. Existing adventures and bought copies keep their snapshots. Recovery retains the old asset grant; discarding the slot or deleting the definition releases it through the existing final-grant cleanup.

## Image delivery sizes

The shared renderer uses compressed WebP derivatives at 64, 128, 256, 512 and 1024 pixels. Its image loader advertises responsive sources, with `sizes` based on the displayed square width divided by the frame size. This accounts for face crops and device pixel density. Callers can set `displayWidth` to their layout's maximum CSS pixel width (default 264); avatars pass their own size, the picker passes 132 and adventure openings pass 224.

Built-in derivatives are committed beside the immutable reference PNGs. To regenerate them, run `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/resize-construct-artwork.ts` from `apps/web/`. The reference loader continues to use the original PNGs for generation.

Generated sources use the same bounded widths through a `width` query parameter on the destination-scoped endpoint. Delivery checks the signed-in user's current access before resizing to WebP and keeps `private, no-store`; it does not use the shared Next.js image optimizer. Omitting `width` retains original-byte delivery for existing callers. Invalid widths are rejected. Resizing never enlarges a smaller source.

## Draft artwork

Generate Images accepts the current unsaved or recovered nonempty Visual description, including a first description. It stores a compatible nonempty generation snapshot without changing the saved definition. Its construct asset grant allows owner-only preview and status recovery. The latest successful draft for the current saved appearance is retained alongside saved and previous artwork; replacement and deletion use the existing grant cleanup. Draft artwork does not enter adventure or Marketplace snapshots until Save attaches it.

Save attaches matching draft artwork and its description without another paid call. Under the generation lock, matching version 2 fingerprints suppress automatic generation; explicit regeneration still spends batteries. A saved submission superseded by another tab before claim reserves nothing. A saved appearance changed during generation rejects the result and keeps prior artwork while settling the one billed call.

Restore previous artwork restores the previous saved artwork and its saved description. Unsaved draft artwork becomes eligible for that recovery slot after explicit Save attaches it. Its recorded description is the actual generation source, so restoring it does not substitute the description that happened to be saved during draft generation.
