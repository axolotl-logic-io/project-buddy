# Construct visuals

A construct has a Visual description and may have artwork. `look` shows the Visual description in the conversation's saved construct. Custom construct editing is removed. Built-in visuals and historical snapshots retain their Visual descriptions and artwork.

## Metadata and identity

`apps/web/src/constructs/visual.ts` exports the Zod schemas `CONSTRUCT_VISUAL`, `VISUAL_ASSET`, `VISUAL_FRAME`, `VISUAL_ROLE` and `VISUAL_DESTINATION`, and their types `ConstructVisual`, `VisualAsset`, `VisualFrame`, `VisualRole` and `VisualDestination`. `ResolvedConstructVisual` describes the resolver result.

`ConstructDefinition.visual` is optional. It contains a visual `description`, an optional `canonical` asset, an optional `working` asset, and optional `frames` for `avatar`, `portrait`, `opening` and `working`. Each frame specifies normalized image coordinates `x`, `y` at the frame center and `size` as a fraction of the square image's width. Assets must be square; the renderer clips the frame to its square container. Missing frames use the whole image. Missing working art uses canonical art.

A built-in reference is `{ kind: "built-in", artwork: "lumen-v1" }` or `vellum-v1`. A generated reference is `{ kind: "generated", assetId: UUID }`. References contain no owner, source construct, provider URL, storage key or expiring signature. A UUID identifies immutable bytes, never an editable slot.

`resolveConstructVisual(construct, role)` accepts a name and definition and returns `asset`, `frame`, `initials` and `description`. It never infers artwork from names, prompt matching or ids. Missing metadata, old own snapshots and custom constructs use initials. Built-ins carry explicit metadata, as do historical copies of them. Snapshots are not backfilled from today's source construct.

`constructVisualSource(asset, destination?)` returns the versioned repository path for built-in assets. A generated reference needs an explicit `VisualDestination`: `{ kind: "construct" | "adventure", id: UUID }`. It resolves to `/api/constructs/visuals/<kind>/<destination id>/<asset id>`. Without a valid destination it returns `undefined`. The delivery route authorizes that destination on every request; the path alone grants no access. Failed image delivery shows initials.

The built-in `description` values are the user-supplied texts, stored verbatim in `src/constructs/lumen.ts` and `vellum.ts`.

## Shared primitives

`apps/web/src/components/constructs/construct-visual.tsx` exports:

- `ConstructAvatar`: `construct: ConstructSnapshot`, optional `size: 32 | 40` (default 40), optional `decorative: boolean`.
- `ConstructIllustration`: `construct: ConstructSnapshot`, `visualRole: VisualRole`, optional `displayWidth`, optional `decorative: boolean`. The parent sets the illustration width; the square fits within it.

The props types, `ConstructAvatarProps` and `ConstructIllustrationProps`, are exported from `src/components/constructs/construct-visual-props.ts`. Both primitives accept an optional `destination: VisualDestination` for generated artwork. Pass the current construct or conversation destination, rather than the private source construct.

Both expose the construct name as the accessible image name. Set `decorative` beside an already visible name. Missing or failed images show initials. The primitives have no animation, status announcement or interactive behavior. The shared classes live in `src/app/page-roles.css` and use semantic tokens.

```tsx
<ConstructAvatar construct={snapshot} size={32} decorative={true} />
<ConstructIllustration construct={snapshot} visualRole="opening" />
```

The supplied avatar frames focus on Lumen's smiling light and Vellum's brass face at small sizes. Other roles keep the supplied composition.

## Character profile

`components/constructs/adventure-character-header.tsx` exports `AdventureCharacterHeader`. The caller supplies the conversation's `construct` snapshot and an optional `destination`; the trail band (`components/header-links.tsx`) passes the Active Dailies quest's conversation, with `{ kind: "adventure", id: chat.id }`. The control opens a keyboard-accessible, scrollable profile and returns focus when closed. `compact={true}` shows the portrait without the name beside it; the button's accessible name still identifies the construct.

Public built-in personality copy requires explicit built-in canonical artwork metadata and unchanged built-in conversational instructions. Other constructs use generic own-construct copy. Names and source ids never infer identity. Neither private prompt text nor the Visual description is shown. Opening a profile makes no model call.

## Storage and snapshots

The JSON definition fields store visual metadata with the prompt. `parseConstructDefinition` ignores invalid visual metadata without losing valid conversational text. System prompts never include the Visual description.

Own construct stores, copies and conversation snapshots all use these shared serializers. Snapshots copy the visual description, immutable references and framing into the conversation's definition. Editing a source doesn't change existing snapshots.

`src/constructs/visual-asset-store.ts` owns immutable bytes and grants:

- A construct grant belongs to its owner. Starting a conversation grants it every referenced asset in the same transaction as its snapshot, and copying a construct grants the copy before returning success. Snapshots and copies therefore outlive private sources without exposing source ids or owners.
- Delivery takes the acting user, destination kind, destination id and asset id. It resolves access with the owner-scope predicates, then confirms that the destination references the asset. Foreign or unreferenced ids read as not found.
- Deleting a source releases only its grant; retirement keeps grants. Bytes are collected only after the last grant is gone, and deletes are idempotent.

## Image delivery sizes

The shared renderer uses compressed WebP derivatives at 64, 128, 256, 512 and 1024 pixels. Its image loader advertises responsive sources, with `sizes` based on the displayed square width divided by the frame size. This accounts for face crops and device pixel density. Callers can set `displayWidth` to their layout's maximum CSS pixel width (default 264); avatars pass their own size and conversation openings pass 224.

Built-in derivatives are committed beside the immutable reference PNGs. To regenerate them, run this command from `apps/web/`:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/resize-construct-artwork.ts
```

Generated sources use the same bounded widths through a `width` query parameter on the destination-scoped endpoint. Delivery checks the signed-in user's current access before resizing to WebP and keeps `private, no-store`; it doesn't use the shared Next.js image optimizer. Omitting `width` delivers the original bytes. Invalid widths are rejected. Resizing never enlarges a smaller source.

## Artwork source

`apps/web/public/constructs/lumen-v1.png` and `vellum-v1.png` are the unmodified reference PNGs supplied by the repository owner on 2026-11-05. No independent artist or license information accompanied the files; don't invent attribution. Runtime uses committed paths, never local attachment paths. Keep these versioned files immutable; new art receives a new versioned path.
