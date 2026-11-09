# Per-journey exploratory baseline

One observation per state/profile/mode. Milliseconds are rounded; missing values are unavailable. Phone means the applied CDP profile, not Lighthouse simulation. Content is an automation proxy, not full usability. See [capture conditions and limitations](README.md).

| State | Profile | Journey | Cold content ms | Warm content ms | Client content ms | Cold TTFB ms | Cold FCP ms | Cold LCP ms | Cold CLS | Cold long-task total ms | Cold resources kB |
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
| populated | desktop | editor | 489 | 388 | missing | 3 | 48 | 508 | 0.101 | 0 | 765 |

TTFB is responseStart minus requestStart from Navigation Timing. LCP is the last buffered candidate in the capture window. CLS uses maximum session windows (1 s gap / 5 s maximum), excluding recent-input entries. Individual interaction shifts remain in the JSON even when excluded from CLS. Resource bytes include background prefetch during the window, omit document bytes and may be zero for memory-cache/cross-origin cases; they are not a critical-route bundle budget. Long-task total is total duration of tasks ≥50 ms, not Lighthouse total blocking time.

Empty-account quest, long-adventure and own-editor cells are intentionally absent: they would be unauthorized/not-found pages. Dedicated empty detail fixtures and editor variants remain outside this exploratory sample.

Captured cells: 53. Expected matrix cells for the defined accessible journeys: 78.
