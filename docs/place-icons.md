# Place icons

The shared `Icon` component uses named imports from `lucide-react` 1.70.0 for the six places. The dependency and root lockfile pin the version. [Lucide's React package](https://lucide.dev/guide/react) includes only imported icons in the bundle. Other interface symbols keep their existing drawings.

| Place | Lucide icon | `Icon` name |
| --- | --- | --- |
| Quests | Shield | `shield` |
| Adventures | MessagesSquare | `messages` |
| Constructs | Bot | `bot` |
| Activities | ListChecks | `checklist` |
| Workshop | Pencil | `pencil` |
| Marketplace | Store | `store` |

`src/home/places.ts` selects the place symbols using internal icon names, which are not persisted or exposed through an API. Pencil also marks editing controls and edit summaries throughout the interface; those uses share the same library artwork. Construct artwork and generated images have separate rendering primitives.

Icons inherit the surrounding text color and the existing `.icon` size roles: 16 px in ordinary interface text and 24 px on Home. The library's 24-unit grid and two-unit strokes scale with those sizes. Icons are hidden from assistive technology and cannot receive focus; the visible destination names carry the meaning. Home retains the responsive atlas, parchment background, link positions and keyboard order. There is no separate Map/List switch in the current Home.

The public Credits page links to Lucide and the full package license at `apps/web/public/licenses/lucide.txt`. This preserves the ISC copyright and permission notice, along with the package's Feather-derived MIT notice. When updating the dependency, update the copied notice and version here together.
