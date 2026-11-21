# Construct visuals

A construct has a Visual description and built-in artwork. `look` shows the Visual description from the conversation's saved construct. Lumen and Vellum are the only constructs with artwork; any other saved construct shows initials.

## Metadata and identity

`ConstructDefinition.visual` (schema in `apps/web/src/constructs/visual.ts`) is optional. It holds a visual description, optional canonical and working assets, and optional frames for the avatar, portrait, opening and working roles. A frame crops the drawing to a square. Missing frames use the whole drawing, and missing working art uses canonical art.

An asset is a built-in reference, `{ kind: "built-in", artwork: "lumen" }` or `"vellum"`. `resolveConstructVisual` never infers artwork from names, prompt matching or ids. Missing or invalid metadata uses initials. A conversation keeps the snapshot saved when it started; nothing backfills it from the current construct.

The built-in `description` values are the user-supplied texts, stored verbatim in `src/constructs/lumen.ts` and `vellum.ts`.

## Shared primitives

`ConstructAvatar` and `ConstructIllustration` in `apps/web/src/components/constructs/construct-visual.tsx` render a conversation's construct snapshot. Both expose the construct name as the accessible image name. Set `decorative` beside an already visible name. A construct without artwork shows initials. The primitives have no animation, status announcement or interactive behavior.

The artwork is inline SVG painted with the active appearance's `--construct-*` tokens. The avatar role uses a simpler drawing for 32 and 40 pixels, and the other roles use the full drawing. A stored frame sets the SVG's `viewBox`.

## Character profile

`ConstructHeader` (`components/constructs/construct-header.tsx`) shows the conversation's construct in the trail band of the Active Dailies quest. The control opens a keyboard-accessible, scrollable profile and returns focus when closed. Its compact form shows the portrait without the name; the button's accessible name still identifies the construct.

Public built-in personality copy requires explicit built-in canonical artwork metadata and unchanged built-in conversational instructions. Other constructs use generic own-construct copy. Names and source ids never infer identity. Neither private prompt text nor the Visual description is shown. Opening a profile makes no model call.

## Storage and snapshots

Visual metadata is stored with the prompt in the definition's JSON. `parseConstructDefinition` ignores invalid visual metadata without losing valid conversational text. System prompts never include the Visual description. Starting a conversation copies the visual metadata into the conversation's definition.

## Artwork source

The SVG sources are in `apps/web/design/artwork/`. `src/draw.py` writes `lumen.svg`, `vellum.svg` and their avatar cuts, and `construct-art.css` there maps their paint classes to the `--construct-*` tokens. The drawings use no third-party parts. To regenerate the SVGs, run this command from the repository root:

```bash
python3 apps/web/design/artwork/src/draw.py
```

To regenerate the inline React components from the SVGs, run this command from the repository root, then format the output from `apps/web/`:

```bash
python3 apps/web/design/artwork/src/to_tsx.py
(cd apps/web && npx biome check --write src/components/constructs/artwork)
```
