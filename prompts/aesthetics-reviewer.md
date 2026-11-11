# Aesthetics reviewer prompt

Review this app's visual design across its appearance modes. Judge how the site looks and feels: its visual identity, typography, color, imagery, surfaces and craft. The usability review sets these aside; this review covers them. Do not repeat its task-completion, navigation or accessibility checks.

Begin by stating the product's intended tone and audience from the available product context. Name the qualities the visual design should convey, such as warmth, playfulness, calm or trustworthiness. Judge each screen against those qualities, and state any assumptions you make about them.

## Sources

Read the repository's `AGENTS.md` instructions, `docs/project-practices.md` and `apps/web/AGENTS.md`. The "Site UI" section of the practices defines the theme rules: one parchment theme with Light, Dark and System modes, and semantic tokens for every color, font, radius, shadow, border width, page decoration and spacing step. Read `apps/web/src/themes/contract.css`, `apps/web/src/themes/parchment.css`, `apps/web/src/app/page-roles.css` and `apps/web/src/components/chat/chat.css`. Read `docs/construct-visuals.md` for construct artwork and framing, and the design records under `docs/design/` and `docs/mockups/`.

The token files tell you what the design intends. The rendered site tells you what users see. Base findings on the rendered site, and use the files to explain causes and to aim recommendations.

## Coverage inventory

Build a screen inventory from `apps/web/use-cases/`, including files omitted from its index, and from the routes in `apps/web/src/routes.ts`. List every page, plus the dialogs, menus, notices and chat states that appear within them. Record the use case slug and documentation path for each screen where one applies. Mark screens that have no visual surface, such as operational cases. Do not substitute a sample of representative screens for complete coverage.

View every screen in both Light and Dark mode. View each at widths of 360 px (phone), 768 px (tablet) and 1920 px (desktop). Look at each screen in these states where they apply:

- Empty, with no saved work.
- Typical, with realistic amounts of content.
- Crowded, with long names, long messages, many items and wrapped text.
- Loading, waiting on a model reply or image, and failed.
- Notices: `Notice`, `FormStatus` and `Alert`.
- Construct artwork present, and missing so initials show.

## What to evaluate

### Areas the usability review leaves out

- **Visual identity:** Whether the parchment theme reads as one intentional design language. Whether it fits the product's tone, and whether any screen looks borrowed from another product or left at framework defaults.
- **Typography:** Typeface choice and pairing, the heading roles and type scale, weight, line height, line length and letter spacing. Check rendered Markdown in chat replies, numbers, gold amounts and long words.
- **Color:** Palette harmony, how accent color earns attention, and how state colors read. Judge Dark mode as its own design, not an inversion of Light. Automated tests check WCAG AA contrast, so judge whether contrast feels comfortable and deliberate rather than merely passing.
- **Imagery and iconography:** Icon style, stroke weight, size and alignment with text. Check construct artwork for quality, crop, framing within its square, and consistency between built-in and generated art. Check that the initials fallback looks designed, not broken.
- **Surfaces and depth:** Borders, radii, shadows and page decorations. Check whether elevation is used consistently and whether decorations support content or compete with it.
- **States as design:** Whether loading, empty, error and success states look as finished as the typical state.
- **Motion:** Any transitions or animated feedback, and whether they feel consistent and restrained. Note where an abrupt change looks unfinished.
- **Consistency across screens:** Whether matching elements look the same everywhere, and whether one-off styles drift from the token contract.
- **Craft:** Misalignment, uneven optical spacing, clipped or overlapping text, orphaned words in headings, awkward wrapping, image distortion, layout shift and rendering glitches.

### Areas both reviews share, seen through an aesthetic lens

The usability review asks whether layout, grouping, spacing and hierarchy help users find things and finish tasks. This review asks whether they look composed and resolved.

- **Layout:** Composition, balance and proportion. Check the alignment grid, the use of white space and the content density. Check whether each width looks designed for rather than squeezed or stretched.
- **Grouping:** Whether groups look cohesive. Check whether cards, borders and dividers are overused where proximity would do, or missing where content runs together.
- **Spacing:** Rhythm and consistency. Check whether spacing follows the theme's scale, keeps a steady vertical rhythm, and avoids both cramped and drifting elements.
- **Hierarchy:** Visual weight and focal points. Check whether each screen has one clear focal point, whether emphasis competes, and whether scale, weight and color agree about what matters most.

When an aesthetic problem also harms usability, report it here for its visual cause. Note the usability consequence in one line and leave the full usability assessment to that review.

## Judgment and evidence

Separate craft defects from matters of taste. A clipped label or a stray hex color is a defect. A preference for a different typeface is taste, and needs a stated principle and a reason it serves the product's tone. Do not recommend a redesign for its own sake.

Capture screenshots as evidence, citing the screen, mode, width and state of each. Save them outside the repository and refer to them by path. Open each screenshot and view it before judging that screen; a saved file you haven't looked at is not evidence. Do not claim to have seen a screen, mode, width or state you did not view. Code inspection can explain a cause, but it does not show how a screen looks.

Aim recommendations at the token contract where possible. Say whether a fix belongs in a component, in a shared role in `page-roles.css` or `chat.css`, or in the theme itself in `parchment.css` or `contract.css`. A finding that recurs across screens usually points to a shared role or token.

## Test data and paid use

Real model use and spending gold are authorized for this review, including replies, generated openings, automatic adventure names, Workshop tests and image generation. Generate construct artwork where needed to judge it in each of its frames. Record paid operations and gold changes where observable.

Use isolated review accounts and disposable data in the supported non-production environment. Create the content needed to show empty, typical and crowded states, and clean it up afterward. Do not alter unrelated or shared user data, send invitations or notifications to uninvolved people, or make Marketplace transfers involving their accounts. Follow `docs/Site-Operations.md` for production boundaries; authorization to spend gold does not authorize production test writes. If an account, service or device is unavailable, report the affected screens as coverage gaps.

## Report

Record the environment, revision, browsers, devices, widths and appearance modes actually assessed.

For each finding, provide:

- **Finding:** A concise description.
- **Screen and state:** The screen, appearance mode, width and state where it occurs.
- **Use case and reference:** The relevant slug and documentation path, or the route if no use case covers it.
- **Evidence:** Screenshot paths and what they show. Add the relevant token, role or component file when you traced the cause.
- **Defect or taste:** Whether it is a craft defect or a design judgment, with the principle behind a judgment.
- **Effect:** How it weakens the product's tone, polish or credibility.
- **Severity:** Polish (seen only on close inspection), noticeable (most users would see it), distracting (pulls attention from content) or damaging (makes the product look broken or untrustworthy).
- **Recommendation:** A concrete change, and whether it belongs in a component, a shared role or the theme.

Lead with the most consequential findings, and group findings that share one cause. Include a coverage table with every screen, its use case slug or route, verdict, the modes and widths viewed, and unassessed states. Use No issue observed, Issue found, Partially assessed, Not assessed or No visual surface. Explain each partial assessment and each missing one. Give totals by verdict.

Finish with the main visual strengths, open questions about the intended tone, coverage gaps, paid operations and cleanup status. Do not make changes to the app, tests or documentation.
