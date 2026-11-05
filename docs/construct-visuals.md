# Construct visuals

Issue [#735](https://github.com/axolotl-logic-io/project-buddy/issues/735) establishes the shared contract for generation, Workshop, adventures and construct selection. Screen integrations and generated-asset delivery are later work in epic #734.

## Metadata and identity

`apps/web/src/constructs/visual.ts` exports the Zod schemas `CONSTRUCT_VISUAL`, `VISUAL_ASSET`, `VISUAL_FRAME` and `VISUAL_ROLE`, and their types `ConstructVisual`, `VisualAsset`, `VisualFrame` and `VisualRole`. `ResolvedConstructVisual` describes the resolver result.

`ConstructDefinition.visual` is optional. Version 1 contains a visual `description`, an optional `canonical` asset, an optional `working` asset, and optional `frames` for `avatar`, `portrait`, `opening` and `working`. Each frame specifies normalized image coordinates `x`, `y` at the frame center and `size` as a fraction of the square image's width. Assets must be square; the renderer clips the frame to its square container. Missing frames use the whole image. Missing working art uses canonical art. One canonical generation is sufficient; no caller should require four paid generations.

A built-in reference is `{ kind: "built-in", artwork: "lumen-v1" }` or `vellum-v1`. A generated reference is `{ kind: "generated", assetId: UUID }`. References contain no owner, source construct, provider URL, storage key or expiring signature. A UUID identifies immutable bytes, never an editable slot. Replacing art allocates a new UUID.

`resolveConstructVisual(construct, role)` accepts a name and definition and returns `asset`, `frame`, `initials` and `description`. It never infers artwork from names, prompt matching or ids. Own constructs can carry the default built-in id in adventure compatibility paths. Missing metadata, old own snapshots and custom constructs use initials. Actual built-ins carry explicit metadata, as do new clones of them. Old snapshots with no metadata retain their fallback; snapshots are not backfilled from today's source construct.

`constructVisualSource(asset)` returns the versioned repository path for built-in assets. Generated references currently return `undefined`, so primitives show initials until the authorized delivery service exists. Do not bypass this with a gallery URL or a source-owner endpoint.

The built-in `description` values are the user-supplied texts, stored verbatim in `src/constructs/lumen.ts` and `vellum.ts`. Generation must use those values as its canonical visual descriptions. Role framing is separate metadata and must preserve character identity and the reference artwork.

## Shared primitives

`apps/web/src/components/constructs/construct-visual.tsx` exports:

- `ConstructAvatar` and `ConstructAvatarProps`: `construct: ConstructSnapshot`, optional `size: 32 | 40` (default 40), optional `decorative: boolean`.
- `ConstructIllustration` and `ConstructIllustrationProps`: `construct: ConstructSnapshot`, `visualRole: VisualRole`, optional `decorative: boolean`. The parent sets the illustration width; the square fits within it.

The props types are exported from `src/components/constructs/construct-visual-props.ts`.

Both expose the construct name as the accessible image name. Set `decorative` beside an already visible name. Missing or failed images show initials. The primitives have no animation, status announcement or interactive behavior. The shared classes live in `src/app/page-roles.css` and use semantic tokens. Downstream owners compose links, status copy and layout around these primitives.

```tsx
<ConstructAvatar construct={snapshot} size={32} decorative={true} />
<ConstructIllustration construct={snapshot} visualRole="opening" />
```

The supplied avatar frames focus on Lumen's smiling light and Vellum's brass face at small sizes. Other roles retain the supplied composition.

## Storage and snapshots

The existing JSON definition fields store metadata with the prompt; no schema migration is needed. `parseConstructDefinition` accepts current prompt and legacy voice/habits forms. Invalid or future visual metadata is ignored without losing valid conversational text. `storedConstructPrompt` writes the legacy-compatible voice/habits form plus visual metadata. Older readers ignore the new property; older writers can drop it during rollback. Re-save art after such a rollback if necessary.

Own construct stores, clone and bought-copy storage, Marketplace publication and adventure snapshots all use these shared serializers. Compatibility text translation preserves the caller's visual metadata and only translates the prompt. Prepared-opening and unchanged-built-in checks compare conversational text only. System prompts read `definition.prompt`; visual descriptions must never be appended to conversational prompts. Prompt forms and prompt resets retain the saved visual metadata.

Snapshots copy the visual description, immutable references and framing into the adventure or listing definition. Editing a source changes neither existing adventure snapshots nor published listings; updating a listing creates its new published snapshot. Buyer and clone definitions retain the same immutable references, without retaining private source access.

## Generated-asset service contract

The service ticket must implement the following before enabling generated rendering. This PR reserves the metadata format, but adds no upload, generation, database store or HTTP endpoint.

1. Generate through the swappable image provider and gold accounting, with one canonical image by default. Validate/decode raster bytes, enforce size limits and persist immutable bytes before attaching metadata. Never persist provider URLs, SVG or user-supplied remote URLs as an asset reference.
2. An owner-scoped attachment operation takes the acting user first and validates their access to the destination construct and every generated reference, including a working variant. Parsing metadata establishes shape, not authorization. Never accept an arbitrary asset UUID as proof of ownership. The generation service must attach through this operation, not generic untrusted definition writes.
3. Separate immutable bytes from grants. A construct grant belongs to its owner. Creating an adventure or publishing a listing must atomically create grants for every referenced asset and persist the snapshot. Clone and buy operations must similarly grant the destination access before returning success. This permits snapshots and bought copies to outlive private sources without exposing source ids or owners.
4. Delivery takes the acting user, destination kind (`construct`, `adventure` or `listing`), destination id and asset id. Resolve access using the existing owner/open-to predicates, then confirm that exact destination snapshot references the asset. Team members read through their adventure grant, never through the author's construct grant. Listing visibility follows signed-in Marketplace rules; buyers keep access after unlisting. Foreign or unreferenced ids read as not found. Do not introduce a public asset-id-only endpoint.
5. Extend `constructVisualSource` and the primitives together with an explicit authorized destination context. Return same-origin resource-scoped paths; recheck access on every request. Use private cache policy, no shared optimizer cache and no persistent signed URL in JSON. Do not enable generated images until real-database tests cover owner/member/outsider isolation and revoked access.
6. Deleting a source releases only its grant. Retirement retains grants. Existing snapshots, listings, clones and bought copies retain their grants. Garbage-collect bytes only after the last reference/grant is gone; retries and deletes are idempotent. Adventure image-gallery cascades must not delete construct artwork. Deleting or unlisting a listing must not invalidate bought copies. A failed generation or attachment leaves no partial metadata; reclaim unattached bytes separately.

The generation service owns byte storage, grants, delivery authorization and collection. This foundation owns the metadata and resolution contract. Downstream UI owners use the exported primitives and do not add parallel role models. Adding generated delivery will require additive, normally generated migrations and transaction coverage for all grant-creation paths above.

## Artwork source

`apps/web/public/constructs/lumen-v1.png` and `vellum-v1.png` are the unmodified reference PNGs supplied by the requesting repository owner for #735 on 2026-11-05. No new art was generated for this PR. No independent artist or license information accompanied the files; do not invent attribution. Runtime uses committed paths, never local attachment paths. Keep these versioned files immutable; new art receives a new versioned path.

## Discovery and character profiles

The construct picker pairs saved artwork with a visible name, personality copy and a brief sample line. The Constructs list uses the same shared portrait primitive. Own-choice reads send only id, name and visual metadata to the picker, without conversational instructions.

`components/constructs/adventure-character-header.tsx` exports `AdventureCharacterHeader`. The caller supplies the adventure's `construct` snapshot and optional `destination: VisualDestination` from the shared service contract. Adventures pass `{ kind: "adventure", id: chat.id }`; own picker and list portraits pass their construct destination. The component forwards it to both shared art primitives. The control opens a keyboard-accessible, scrollable profile and returns focus when closed. The conversation integration owns insertion beside the adventure name.

Public built-in personality copy is selected through explicit built-in canonical artwork metadata. Names and source ids never infer identity. Own snapshots without that metadata use generic public copy; neither private prompt text nor Visual description instructions are shown. Selection and profile opening make no model calls.
