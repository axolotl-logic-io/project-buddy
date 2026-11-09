# Per-journey exploratory baseline

First contentful paint (FCP), largest contentful paint (LCP) and cumulative layout shift (CLS) describe paint and initial-load stability.

One observation per state/profile/mode. Milliseconds are rounded; missing values are unavailable. Phone means the applied CDP profile, not Lighthouse simulation. Content is an automation proxy, not full usability. See [capture conditions and limitations](README.md).

| State | Profile | Journey | Cold content ms | Warm content ms | Client content ms | Cold request-to-headers ms | Cold FCP ms | Cold LCP ms | Cold CLS | Cold long-task total ms | Cold resources kB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| empty | desktop | home | 319 | 309 | 332 | 5 | 64 | 344 | 0.233 | 0 | 1280 |
| empty | desktop | quests | 310 | 307 | 350 | 4 | 80 | 348 | 0.000 | 0 | 448 |
| empty | desktop | adventures | 319 | 306 | 331 | 2 | 44 | 336 | 0.000 | 0 | 431 |
| empty | desktop | activities | 305 | 313 | 333 | 4 | 48 | 320 | 0.000 | 0 | 432 |
| empty | desktop | workshop | 305 | 309 | 332 | 3 | 84 | 320 | 0.000 | 0 | 976 |
| empty | phone | home | 720 | 492 | 236 | 2 | 748 | 748 | 0.000 | 162 | 338 |
| empty | phone | quests | 728 | 517 | 485 | 2 | 740 | 740 | 0.002 | 153 | 390 |
| empty | phone | adventures | 723 | 492 | 473 | 2 | 736 | 736 | 0.001 | 155 | 387 |
| empty | phone | activities | 730 | 500 | 534 | 3 | 744 | 744 | 0.031 | 155 | 389 |
| empty | phone | workshop | 736 | 549 | 547 | 2 | 744 | 744 | 0.003 | 156 | 385 |
| populated | desktop | home | 316 | 315 | 340 | 2 | 44 | 332 | 0.233 | 0 | 1710 |
| populated | desktop | quests | 175 | 315 | 336 | 3 | 36 | 192 | 0.000 | 0 | 479 |
| populated | desktop | quest | 307 | 311 | 337 | 3 | 48 | 320 | 0.000 | 0 | 893 |
| populated | desktop | adventures | 118 | 318 | 333 | 2 | 48 | 48 | 0.000 | 0 | 868 |
| populated | desktop | long-adventure | 528 | 339 | 380 | 3 | 100 | 544 | 0.000 | 137 | 861 |
| populated | desktop | activities | 120 | 307 | 336 | 3 | 60 | 60 | 0.000 | 0 | 433 |
| populated | desktop | workshop | 172 | 51 | 340 | 4 | 68 | 68 | 0.000 | 0 | 1210 |
| populated | desktop | editor | 489 | 388 | 118 | 3 | 48 | 508 | 0.101 | 0 | 765 |
| populated | phone | home | 725 | 474 | 526 | 2 | 772 | 772 | 0.046 | 146 | 338 |
| populated | phone | quests | 733 | 505 | 586 | 2 | 740 | 740 | 0.002 | 152 | 390 |
| populated | phone | quest | 735 | 507 | 579 | 2 | 760 | 760 | 0.002 | 155 | 391 |
| populated | phone | adventures | 741 | 504 | 292 | 2 | 752 | 752 | 0.001 | 155 | 388 |
| populated | phone | long-adventure | 727 | 520 | 1504 | 3 | 824 | 824 | 0.000 | 83 | 313 |
| populated | phone | activities | 735 | 502 | 584 | 2 | 748 | 748 | 0.031 | 147 | 390 |
| populated | phone | workshop | 736 | 535 | 608 | 2 | 752 | 752 | 0.003 | 156 | 385 |
| populated | phone | editor | 723 | 509 | 917 | 3 | 748 | 748 | 0.002 | 0 | 369 |

Request-to-headers is responseStart minus requestStart from Navigation Timing (stored as `nav.ttfb`). It excludes navigation-start waiting, including the emulated delay; it is not end-to-end time to first byte (TTFB). The archive lacks the fields to reconstruct that value. LCP is the last buffered candidate in the capture window. CLS uses maximum session windows (1 s gap / 5 s maximum), excluding recent-input entries. Individual interaction shifts remain in the JSON even when excluded from CLS. Resource bytes include background prefetch during the window, omit document bytes and may be zero for memory-cache/cross-origin cases; they are not a critical-route bundle budget. Long-task total is total duration of tasks ≥50 ms, not Lighthouse total blocking time.

Empty-account quest, long-adventure and own-editor cells are intentionally absent: they would be unauthorized/not-found pages. Dedicated empty detail fixtures and editor variants remain outside this exploratory sample.

Captured cells: 78. Expected matrix cells for the defined accessible journeys: 78.

## Client-transition movement and work

The transition diagnostic sums **all** layout-shift entries after the observer arrays are cleared immediately before activating the route link, through content presence plus the two-second observation window. It includes `recentInput` entries and is not official CLS. All nonzero captured transition entries have recent input; excluding them would hide every measured route jump. Sources below are affected nodes, not necessarily the activated link. The recipes activate a visible destination anchor; exact activated-element geometry was not retained. Future captures must record its safe region and geometry separately from shift-source rectangles.

| State | Profile | Destination | All-shift sum | Recent-input sum | Source tags (entry counts) | Long-task total / max ms |
| --- | --- | --- | --- | --- | --- | --- |
| empty | desktop | home | 0.5514 | 0.5514 | MAIN (1), HEADER (1) | 0 / 0 |
| empty | desktop | quests | 0.2333 | 0.2333 | MAIN (1), HEADER (1) | 0 / 0 |
| empty | desktop | adventures | 0.2333 | 0.2333 | MAIN (1), HEADER (1) | 0 / 0 |
| empty | desktop | activities | 0.2333 | 0.2333 | MAIN (1), HEADER (1) | 0 / 0 |
| empty | desktop | workshop | 0.2333 | 0.2333 | MAIN (1), HEADER (1) | 0 / 0 |
| empty | phone | home | 0.0243 | 0.0243 | MAIN (1), HEADER (1) | 0 / 0 |
| empty | phone | quests | 0.0243 | 0.0243 | MAIN (1), HEADER (1) | 0 / 0 |
| empty | phone | adventures | 0.0243 | 0.0243 | MAIN (1), HEADER (1) | 0 / 0 |
| empty | phone | activities | 0.0243 | 0.0243 | MAIN (1), HEADER (1) | 0 / 0 |
| empty | phone | workshop | 0.0243 | 0.0243 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | desktop | home | 0.5514 | 0.5514 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | desktop | quests | 0.2333 | 0.2333 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | desktop | quest | 0.0000 | 0.0000 | none | 0 / 0 |
| populated | desktop | adventures | 0.2333 | 0.2333 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | desktop | long-adventure | 0.0000 | 0.0000 | none | 0 / 0 |
| populated | desktop | activities | 0.2333 | 0.2333 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | desktop | workshop | 0.2333 | 0.2333 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | desktop | editor | 0.1008 | 0.1008 | DIV (1) | 0 / 0 |
| populated | phone | home | 0.0704 | 0.0704 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | phone | quests | 0.0243 | 0.0243 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | phone | quest | 0.0000 | 0.0000 | none | 0 / 0 |
| populated | phone | adventures | 0.0243 | 0.0243 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | phone | long-adventure | 0.0000 | 0.0000 | none | 1278 / 234 |
| populated | phone | activities | 0.0486 | 0.0486 | MAIN (2), HEADER (2) | 0 / 0 |
| populated | phone | workshop | 0.0243 | 0.0243 | MAIN (1), HEADER (1) | 0 / 0 |
| populated | phone | editor | 0.0000 | 0.0000 | none | 104 / 104 |

Quests → Home produces the largest single recorded shift, 0.5514 on desktop (empty and populated), attributed to MAIN and HEADER. Home → Quests, Adventures, Activities and Workshop each records 0.2333 on desktop. Workshop → editor records 0.1008 on a DIV. Nonzero phone transition totals range from 0.0243 to 0.0704. Zero entries apply only to this window, not all later movement. Full previous/current source rectangles remain in `baseline.json.gz`.

For populated desktop Quests → Home, MAIN moves y=64→88 and height=836→812; HEADER moves (x,y,width,height)=(0,0,1440,108)→(16,16,1408,74). These are shared-frame sources, separate from the clicked anchor. The old Home cold-load 0.2333 is smaller than this transition diagnostic. All observations predate #767; there is no measured post-fix improvement here.
