# Appearance

The site panel and Settings offer three texture swatches:

- **Ivory Vellum** uses pale parchment, sepia text, cream panels, and gold accents. This is the default.
- **Soot & Brass** uses a burgundy book cover, warm charcoal panels, ivory text, and restrained brass accents.
- **Espresso Leather** uses dark brown leather with the sepia and gold dark palette.

Each swatch shows its background texture and a decorative mark from its appearance. The mark is hidden from assistive technology. The material stays fully opaque and keeps its own colors under every active appearance.

A solid outline around the chosen tile marks selection; a separate dashed outline marks keyboard focus. Each native radio has its appearance name as its accessible name. A tooltip shows that name on hover, keyboard focus, or a tap that selects the swatch. Escape dismisses the tooltip without moving focus or changing the selection.

The controls work by touch at 320 px, with targets at least 44 px wide and tall. There is no Light, Dark, or System control, and operating system appearance changes do not change the selection.

Selecting a swatch changes the page immediately and saves the selection in this browser's theme cookie. Navigation, reloading, signing out, and failed pages keep it. The server includes the saved appearance in the first HTML response. Pages recovered in the browser restore the appearance from the same cookie. Stored `light` and `system` values resolve to Ivory Vellum, and stored `dark` values resolve to Espresso Leather. Invalid values use Ivory Vellum.

The semantic token contract in `apps/web/src/themes/contract.css` selects the palette and texture. Components use semantic roles and do not choose palette colors.

Each texture is a generated, optimized 1024 px WebP file in `apps/web/public/textures/`. A fixed, covering background keeps the texture aligned with the conversation composer on long pages.

The Timer pairs an illustration with each site appearance. Appearance is chosen in the left site panel or Settings, and the Timer follows it. See [Timer appearance preferences](timer.md#timer-appearance-preferences).
