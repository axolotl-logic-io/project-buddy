# Construct visuals

A construct has a Visual description and may have artwork. `look` shows the Visual description in the conversation's saved construct. Built-in constructs and saved conversation snapshots carry their own Visual descriptions and artwork.

## Metadata and identity

`ConstructDefinition.visual` (schemas in `apps/web/src/constructs/visual.ts`) is optional. It holds a visual description, optional canonical and working assets, and optional frames for the avatar, portrait, opening and working roles. Assets must be square; a frame crops to a square container. Missing frames use the whole image, and missing working art uses canonical art.

A built-in reference names a built-in drawing (`lumen-v2` or `vellum-v2`). Saved snapshots can also reference the immutable `lumen-v1` and `vellum-v1` raster artwork. A generated reference holds only an asset UUID, never an owner, source construct, provider URL, storage key or expiring signature. A UUID identifies immutable bytes, never an editable slot.

`resolveConstructVisual` never infers artwork from names, prompt matching or ids. Missing metadata, old own snapshots and custom constructs use initials. Snapshots are not backfilled from today's source construct.

A generated reference resolves to a URL only with an explicit destination, a construct or a conversation (`VisualDestination`). The delivery route authorizes that destination on every request; the path alone grants no access. Failed image delivery shows initials.

The built-in `description` values are the user-supplied texts, stored verbatim in `src/constructs/lumen.ts` and `vellum.ts`.

## Shared primitives

`ConstructAvatar` and `ConstructIllustration` in `apps/web/src/components/constructs/construct-visual.tsx` render a conversation's construct snapshot. Pass the current construct or conversation destination for generated artwork, rather than the private source construct.

Both expose the construct name as the accessible image name. Set `decorative` beside an already visible name. Missing or failed images show initials. The primitives have no animation, status announcement or interactive behavior.

The artwork is inline SVG painted with the active appearance's `--construct-*` tokens. The avatar role uses a simpler drawing for small sizes, and the other roles use the full drawing. A stored frame sets the SVG's `viewBox` or crops the delivered raster image.

## Character profile

`AdventureCharacterHeader` (`components/constructs/adventure-character-header.tsx`) shows the conversation's construct in the trail band of the Active Dailies quest. The control opens a keyboard-accessible, scrollable profile and returns focus when closed. Its compact form shows the portrait without the name; the button's accessible name still identifies the construct.

Public built-in personality copy requires explicit built-in canonical artwork metadata and unchanged built-in conversational instructions. Other constructs use generic own-construct copy. Names and source ids never infer identity. Neither private prompt text nor the Visual description is shown. Opening a profile makes no model call.

## Storage and snapshots

Visual metadata is stored with the prompt in the definition's JSON. `parseConstructDefinition` ignores invalid visual metadata without losing valid conversational text. System prompts never include the Visual description.

Snapshots copy the visual description, immutable references and framing into the conversation's definition. Editing a source doesn't change existing snapshots.

`src/constructs/visual-asset-store.ts` owns immutable bytes and grants:

- A construct grant belongs to its owner. Starting a conversation grants it every referenced asset in the same transaction as its snapshot, and copying a construct grants the copy before returning success. Snapshots and copies therefore outlive private sources without exposing source ids or owners.
- Delivery takes the acting user, destination kind, destination id and asset id. It resolves access with the owner-scope predicates, then confirms that the destination references the asset. Foreign or unreferenced ids read as not found.
- Deleting a source releases only its grant; retirement keeps grants. Bytes are collected only after the last grant is gone, and deletes are idempotent.

## Image delivery sizes

The shared renderer delivers raster artwork as compressed WebP derivatives at fixed widths from 64 to 1024 pixels, with `sizes` based on the displayed square width divided by the frame size. This accounts for face crops and device pixel density. Callers can set `displayWidth` to their layout's maximum CSS pixel width.

Inline SVG scales to the display width without a source URL, `sizes` or WebP derivatives.

Built-in raster derivatives are committed beside the immutable reference PNGs. To regenerate them, run this command from `apps/web/`:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/resize-construct-artwork.ts
```

Generated sources use the same widths through a `width` query parameter on the destination-scoped endpoint. Delivery checks the signed-in user's current access before resizing to WebP and keeps `private, no-store`; it doesn't use the shared Next.js image optimizer. Omitting `width` delivers the original bytes. Invalid widths are rejected. Resizing never enlarges a smaller source.

## Artwork source

`apps/web/public/constructs/lumen-v1.png` and `vellum-v1.png` are the unmodified reference PNGs supplied by the repository owner on 2026-11-05. No independent artist or license information accompanied the files; don't invent attribution. Runtime uses committed paths. Keep these versioned files immutable; new art receives a new versioned path.

The SVG sources are in `apps/web/design/artwork/`. `src/draw.py` writes `lumen.svg`, `vellum.svg` and their avatar cuts, and `construct-art.css` there maps their paint classes to the `--construct-*` tokens. The drawings use no third-party parts. To regenerate the SVGs, run this command from the repository root:

```bash
python3 apps/web/design/artwork/src/draw.py
```

To regenerate the inline React components from the SVGs, run this command from the repository root, then format the output from `apps/web/`:

```bash
python3 apps/web/design/artwork/src/to_tsx.py
(cd apps/web && npx biome check --write src/components/constructs/artwork)
```
