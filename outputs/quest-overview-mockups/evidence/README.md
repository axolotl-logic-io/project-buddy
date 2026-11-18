# Quest overview visual check

The app screenshots use the local `integration` checkout at `4d789c5bd6c39bcf3420e29453a97dbf3ca01ec6` with a separate local implementation of #1068. [PR #1069](https://github.com/axolotl-logic-io/project-buddy/pull/1069) records the implementation merged into integration. Chromium captured the signed-in app at 1280 × 900 and 320 × 568 CSS pixels. Each comparison pairs the app on the left with the [HTML reference](../quest-overview.html) on the right.

| State | Desktop | Phone |
| --- | --- | --- |
| Ordinary quest overview, no active spell | [1280 px overview](1280-overview.webp) | [320 px overview](320-overview.webp) |
| Running Timer | [1280 px Timer](1280-timer.webp) | [320 px Timer](320-timer.webp) |
| Tasks spell after sending a message | [1280 px spell](1280-spell.webp) | [320 px spell](320-spell.webp) |

The ordinary quest fixture is “Restore the garden workbench” at `/quests/2a390d8c-2b9e-40a7-a398-33ade1792467`. The spell and running Timer captures use its `?section=spells` view. The running Timer shows the start of Work in Ivory Vellum, Work underway in Soot & Brass, and Break in Espresso Leather.

The Dailies fixture is at `/quests/34780ef3-5506-43f3-adb9-12475e526c0c`. Each appearance shows an empty day record and the state just after Start Day, with Undo available.

| Appearance | 1280 px before and after Start Day | 320 px before and after Start Day |
| --- | --- | --- |
| Ivory Vellum | [Before](light-1280-dailies-empty.webp), [After](light-1280-dailies-started.webp) | [Before](light-320-dailies-empty.webp), [After](light-320-dailies-started.webp) |
| Soot & Brass | [Before](soot-brass-1280-dailies-empty.webp), [After](soot-brass-1280-dailies-started.webp) | [Before](soot-brass-320-dailies-empty.webp), [After](soot-brass-320-dailies-started.webp) |
| Espresso Leather | [Before](dark-1280-dailies-empty.webp), [After](dark-1280-dailies-started.webp) | [Before](dark-320-dailies-empty.webp), [After](dark-320-dailies-started.webp) |

The app uses its signed-in header and the existing expandable right sidebar. The Timer docks flush on desktop and uses the full-height drawer on phones. The spell uses the app’s Folio transcript and composer. Fixture counts and membership differ from the reference.
