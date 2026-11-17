# Hourglass implementation visual check

Captured from the actual Next.js application on 2026-11-17, using the shared browser at localhost:3000. Branch: `integration`. Base head: `9416a42474501efae9220bf8ceefd516f0ab6d0c`, with the uncommitted hourglass implementation applied. The SHA-256 of the tracked binary diff followed by the new `timer-hourglass.tsx` file is `2ea370614fddea3ea2c912e6506133329961f34f996489776ffde81ebc58938c`.

The approved reference is [the scribe’s hourglass](../scribes-hourglass.html), previewed at 728 px and 320 px. The implementation preserves its SVG frame, glass, bowls, sand texture, two-column desktop composition and stacked phone composition. It uses the site's existing texture without an extra card or repeated title. The sand is slightly darker than the mockup to strengthen graphical contrast. The phone countdown was corrected to 68 px after comparison. Hour-long values use a smaller size to fit. The other two appearances retain their circular dials and centered countdowns.

The clock was fixed in the browser for repeatable visual states and the visibility-change event refreshed the schedule. All screenshots show the page without artificial layout overrides; appearance fixtures use the site's actual appearance tokens. The preferences screenshot follows a click on the real right expander. Browser tests separately exercise the actual appearance choices, keyboard focus, copying and schedule transitions.

| Screenshot | Viewport | Page | State |
| --- | --- | --- | --- |
| [ivory-desktop-work.png](ivory-desktop-work.png) | 1200 × 900 | `/timer/50/10/0` | Ivory Vellum; Work 24:11; Date.now() = 1549000; sand partway |
| [ivory-phone-work.png](ivory-phone-work.png) | 320 × 900 | `/timer/50/10/0` | Ivory Vellum; Work 24:11; Date.now() = 1549000 |
| [ivory-desktop-start.png](ivory-desktop-start.png) | 1200 × 900 | `/timer/50/10/0` | Ivory Vellum; Work 50:00; Date.now() = 0; full upper bowl, empty lower bowl |
| [ivory-phone-break.png](ivory-phone-break.png) | 320 × 900 | `/timer/50/10/0` | Ivory Vellum; Break 10:00; Date.now() = 3000000; sand reset |
| [ivory-phone-hours.png](ivory-phone-hours.png) | 320 × 900 | `/timer/120/10/0` | Ivory Vellum; Work 01:00:00; Date.now() = 3600000 |
| [ivory-480-work.png](ivory-480-work.png) | 480 × 900 | `/timer/50/10/0` | Ivory Vellum; Work 24:11; compact two-column layout |
| [soot-desktop-work.png](soot-desktop-work.png) | 1200 × 900 | `/timer/50/10/0` | Soot & Brass; Work 24:11 |
| [soot-phone-work.png](soot-phone-work.png) | 320 × 900 | `/timer/50/10/0` | Soot & Brass; Work 24:11 |
| [leather-desktop-work.png](leather-desktop-work.png) | 1200 × 900 | `/timer/50/10/0` | Espresso Leather; Work 24:11 |
| [leather-phone-work.png](leather-phone-work.png) | 320 × 900 | `/timer/50/10/0` | Espresso Leather; Work 24:11 |
| [ivory-phone-preferences.png](ivory-phone-preferences.png) | 320 × 900 | `/timer/50/10/0` | Ivory Vellum; preferences opened with right expander; Copy link visible |

The initial comparison used 900 px tall phone screenshots. At 320 px the page has no horizontal overflow, including the hour-long countdown. Full and reset bowls were checked visually; browser coverage also checks draining and filling at half and near the end of a period, and after the transition to Break. Both darker appearances were checked at desktop and phone sizes. A [follow-up phone assessment](phone-review/README.md) found that shorter viewports push the countdown below the fold; the initial check did not establish small-phone readiness.

Validation: `npm --workspace apps/web run check` passed (274 tests plus lint, types and script checks). Focused Chromium and WebKit browser checks passed: 138 tests across Timer behavior, appearance choices and appearance saving. No server or database code changed.
