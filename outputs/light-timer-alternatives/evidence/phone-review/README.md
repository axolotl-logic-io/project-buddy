# Phone visual assessment

Reviewed 2026-11-17 on branch `integration`, base head `9416a42474501efae9220bf8ceefd516f0ab6d0c` with the existing uncommitted hourglass implementation. This assessment changes no product code.

Reference: [approved hourglass mockup](../../scribes-hourglass.html), rendered again at 320 and 390 CSS px. The actual application was checked on `http://localhost:3000/timer/50/10/0`, in Ivory Vellum, with `Date.now() = 1549000` and a visibility-change event producing Work 24:11.

| Actual viewport | Assessment | Screenshot |
| --- | --- | --- |
| 320 × 568 | Fails the initial view: countdown extends to y590, below the viewport; next-period label extends to y640 and requires scrolling. | [320 × 568](320x568.png) |
| 360 × 640 | Countdown is visible; next-period text is at the bottom edge with no useful breathing room. | [360 × 640](360x640.png) |
| 390 × 844 | Good match to the mockup; full timer visible and centered. | [390 × 844](390x844.png) |
| 430 × 932 | Good match to the mockup; full timer visible and centered. | [430 × 932](430x932.png) |

There is no horizontal overflow at these widths. On the two shorter viewports the browser reserves a 15 px vertical scrollbar, so available document widths are 305 and 345 px.

The illustration matches the reference at 132 × 229.56 px. Countdown typography is 68 px, with lining numerals. Glass shape, sand levels, decorations, centered stack and short rule match the approved design. Sand is intentionally darker for contrast, as recorded in the implementation check. The vellum texture covers the actual page rather than a standalone mockup card, so its scale differs.

The main issue is height, rather than width. The fixed 520 px timer layout follows roughly 170 px of header and page spacing. It places the visible glass around y233, leaving about 100 px between the trail and the glass. On short screens this pushes the countdown and next-period label too low. A compact-height layout should reduce the top and inter-element spacing while preserving the illustration and countdown proportions on standard phones.

This finding qualifies the previous visual check, which used 900 px tall phone screenshots. Width alone was insufficient evidence for small-phone readiness.

The release preparation subsequently fixed this issue. See the [compact-phone release verification](../compact-release/README.md) for the implementation and new screenshots.
