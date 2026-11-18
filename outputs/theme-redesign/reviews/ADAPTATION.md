# Review of the redesign mockups

This file adapts the reviewer prompts in `prompts/` to the theme redesign. Each review thread reads its prompt in full, then this file. Where they conflict, this file wins.

## What you review

You review the proposed redesign, not the live site. The redesign is a set of HTML mockups built from the site's real rendered HTML:

- `views/` holds one page per critical view and state. Each page takes `?appearance=light|soot-brass|dark&width=1280|360` and also has an on-page switcher.
- `index.html` shows each current screenshot beside its proposed view.
- `system/specimen.html` shows every component in every state in each appearance.
- `system/components.md` and `system/THEME-INTERFACE.md` describe the component system. `themes/<appearance>/DIRECTION.md` describes each appearance.
- `artwork/specimen.html` shows the proposed construct artwork.
- `capture/` holds the current site: screenshots, rendered HTML and the class inventory.

`BRIEF.md` gives Autumn's goals and constraints. Judge the mockups against them. The three textures must not change, there is no image generation, and each appearance should match the ornament and style of its timer.

## Changes to the prompts

- **Appearances.** The prompts say Light and Dark mode. The site has three appearances instead: Ivory Vellum (`light`), Soot & Brass (`soot-brass`) and Espresso Leather (`dark`). Review all three, each as its own design.
- **Widths.** The mockups exist at 1280 px and 360 px. Review both. Report anything you would expect to break at 768 px as a hypothesis, not a finding.
- **Coverage.** The coverage inventory is the critical views and states in `BRIEF.md`, not every use case. List the use case slug for each view. Name use cases that the critical views leave out, and say whether the design system's components would cover them.
- **Comparison.** For each view, compare the mockup with the current screenshot of the same view, appearance and width in `capture/screenshots/`. Report anything the mockup lost from the current site: a control, a label, a state, a piece of content or an accessible name. Report what it improves.
- **Interaction.** Mockups are static or lightly scripted. Assess interactions that the markup and styles show: focus outlines, selection, hover, pressed and busy states, open overlays and touch target sizes. For behavior the mockup can't show, judge whether the markup keeps the current site's behavior, and mark that as inferred.
- **Accounts and data.** Don't create accounts or run the site. The prompts' test-data, database and cleanup sections don't apply.
- **Implementability.** Add one dimension: whether each component can move into the app as described in `IMPLEMENTATION.md`. Check that it uses semantic tokens only, has an ornament slot rather than per-theme overrides, has a clear mapping from current classes, and makes no hidden layout assumptions. Report places where the prototype would be hard to build as specified.
- **Evidence.** Take screenshots with Playwright, which is in `apps/web/node_modules`. Save them in your own folder under `reviews/`, and look at each one before citing it.

## Output

Write your report to `reviews/<review>/REPORT.md`, where `<review>` is `aesthetics` or `usability`. Use the finding format in your prompt. Lead with the findings that would most change Autumn's choice between options, or most change what to build. End with a short list of recommended changes, each marked _apply_ (clear improvement), _decide_ (Autumn's call) or _skip_ (not worth it), and the path that each change belongs in. Don't edit any file outside your review folder.
