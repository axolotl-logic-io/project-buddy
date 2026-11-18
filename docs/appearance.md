# Appearance

The site panel and Settings offer three texture swatches:

- **Ivory Vellum** uses pale parchment, sepia text, cream panels, and gold accents. This is the default.
- **Soot & Brass** uses a burgundy book cover, warm charcoal panels, ivory text, and restrained brass accents. Its header, navigation, fields, buttons, and Timer panel follow the approved palette.
- **Espresso Leather** uses dark brown leather with the sepia and gold dark palette.

The swatch row stays compact on desktop and reserves space above the tiles so tooltips do not cover the Theme label.

Each material remains fully opaque and keeps its own colors under every active appearance. Tooltip borders have no shadow that can tint the texture. Each swatch shows its background texture and a decorative mark from its appearance. The mark is hidden from assistive technology.

A solid outline around the chosen tile marks selection; a separate dashed outline marks keyboard focus. Each native radio has its appearance name as its accessible name. A tooltip shows that name on hover, keyboard focus, or a tap that selects the swatch. Escape dismisses the tooltip without moving focus or changing the selection.

The same controls work by touch at 320 px, with targets at least 44 px wide and tall. There is no Light, Dark, or System control, and operating system appearance changes do not change the selection.

Selecting a swatch changes the page immediately and saves the selection in this browser's theme cookie. Navigation, reloading, signing out, and failed pages keep it. The inline script in the document head applies the saved choice before the first paint. Existing Light or System cookies resolve to Ivory Vellum; existing Dark cookies resolve to Espresso Leather. Invalid values use Ivory Vellum.

The semantic token contract in `apps/web/src/themes/contract.css` selects the palette and texture from `parchment.css`. The internal `light` and `dark` values remain for cookie compatibility; `soot-brass` selects the third palette. Components use semantic roles and do not choose palette colors. Contract and contrast tests cover all three appearances, including header and panel colors.

The three generated material textures were approved as L1, D2, and D1 during design review. Their optimized 1024 px WebP files live in `apps/web/public/textures/`: `ivory-vellum.webp`, `soot-brass.webp`, and `espresso-leather.webp`. A fixed, covering background keeps the texture aligned with the conversation composer on long pages. The old `parchment.svg` URL remains available for older pages.

The Timer pairs an illustration with each site appearance: the scribe’s hourglass for Ivory Vellum, a Gothic hour dial for Soot & Brass, and a necromantic seal for Espresso Leather. Appearance is chosen in the left site panel or Settings; the timer’s right sidebar offers Copy link. The illustrations use the page's existing texture and palette. See [Timer appearance preferences](timer.md#timer-appearance-preferences).
