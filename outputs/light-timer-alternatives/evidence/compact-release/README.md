# Compact-phone release verification

Verified 2026-11-17 on branch `feat/timer-hourglass-release`, based on `a6dfa538edba7eabc161554e77470cd994477a7d`, with the uncommitted release changes applied. The SHA-256 of the tracked binary diff followed by the new `timer-hourglass.tsx` file is `63a62c0ad80525d9f457cafddf146f315e1cef43c1651f5e34f1afa658c12746`.

These screenshots show the real application at `http://localhost:3000/timer/50/10/0`, in Ivory Vellum, displaying Work 24:11 with `Date.now() = 1549000`. Browser visibility-change events refresh the schedule.

The [phone assessment](../phone-review/README.md) found that the initial 520 px minimum height pushed the readout below the fold on short phones. The fix uses compact vertical spacing at widths up to 460 px and heights up to 672 px. It removes excess top and bottom spacing and reduces the gap before the next period. The illustration stays 132 px wide and the countdown stays 68 px. Taller phones and desktop preserve the approved composition.

| Viewport and screenshot | Scroll width | Scroll height | Next label bottom | Countdown size |
| --- | --- | --- | --- | --- |
| [320 × 568](320x568.png) | 320 | 568 | 533.06 | 68px |
| [360 × 640](360x640.png) | 360 | 640 | 533.06 | 68px |
| [390 × 667](390x667.png) | 390 | 667 | 531.06 | 68px |
| [390 × 844](390x844.png) | 390 | 844 | 638.77 | 68px |
| [1200 × 900](1200x900.png) | 1200 | 900 | 584.30 | 116px |

The complete readout is visible with breathing room at 320 × 568, 360 × 640 and 390 × 667. No horizontal or vertical overflow occurs at these sizes in the actual app. The standard phone and desktop screenshots still match the approved hourglass design. Existing darker appearances retain their circular layouts.

Regression coverage checks countdown and next-period visibility on all three short-phone viewports in Chromium and WebKit. The earlier assessment remains available as a record of the reproduced issue.
