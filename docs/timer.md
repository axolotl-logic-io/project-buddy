# Timer

The Timer helps a user work and rest on a repeating schedule, alone or alongside others who open the same link. Its terms are in the [glossary](../GLOSSARY.md#timer), and its use cases are in [Timer use cases](../apps/web/use-cases/timer.md). It brings the user-facing behaviour of [Axolotl Time](https://github.com/axolotl-logic-io/axolotl-time) into Project Buddy.

## Setup

**Timer** in the site panel's Places opens `/timer`. Anyone may open `/timer` and every timer link without signing in. Two selectors, **Work for** and **Break for**, each offer 10, 15, 25, 30, 45, 50, 60 and 120 minutes. A browser tab that has shown no timer offers 50 and 10 minutes; otherwise it offers the lengths of the timer it showed last. The tab's session storage keeps them, so another tab or device starts from the defaults.

Setup has two actions:

- **Start** opens a new schedule that begins now, with work.
- **Join global timer** opens the schedule that starts at the Unix epoch. Everyone who chooses the same lengths joins the same schedule, often partway through a period.

## Timer links

A running timer's address is its whole schedule:

```text
/timer/WORK/BREAK/START
/timer/25/15/1763197200000   25 minutes of work, 15 of break, from 2025-11-15 09:00 UTC
/timer/50/10/0               the global 50/10 timer
```

`WORK` and `BREAK` must be preset lengths. `START` is whole milliseconds since the Unix epoch. A start up to one minute ahead of the viewer's clock counts as now, to allow for clocks that disagree a little. A link with any other value, or a start further ahead, shows **This isn't a timer link** and a way back to setup, with no countdown.

The link holds no quest, conversation or account data, so the proxy (`src/proxy.ts`) lets `/timer` and every path under it through without a session. A signed-out visitor sees the same timer, its trail and **Copy link**. Every other signed-out page still leads to sign-in.

## Running timer

The page shows an hourglass or dial on the site’s own texture, the period's name, **Work** or **Break**, and the time left as `MM:SS`, or `HH:MM:SS` from an hour. The illustration is decoration; the name and time say everything in text. The countdown has the `timer` role, so screen readers don't read every second. A hidden status line announces the period's name as each one begins.

The browser's clock decides the period: `src/timer/schedule.ts` works it out from the time since the start. The page reads the clock at each second the countdown shows and whenever its tab comes back into view. A tab that slept therefore shows the current period at once and replays nothing. Two devices agree when their clocks do; the site doesn't synchronize clocks.

The bar with the page's trail, **Timer › Work 25 · Break 15**, holds the count of others following the schedule. **Timer preferences** at its right opens a sidebar with **Copy link**. **Copy link** copies the page's address and reads **Copied** for two seconds, or **Copy failed** when the browser refuses. A hidden status line says the same to a screen reader. **Timer** in the trail leads back to setup. A link whose start is still ahead of the server's clock shows neither the count nor **Copy link**.

The timer writes no message, completes no task, records no milestone, sends no notification and makes no model request.

## Timer appearance preferences

The Timer follows the site's saved appearance. Each site appearance has a paired timer illustration:

- **Ivory Vellum**: the scribe’s hourglass in sepia ink with golden sand.
- **Soot & Brass**: a Gothic hour dial with pointed chapter marks in muted brass on burgundy.
- **Espresso Leather**: the necromantic seal and blackletter phase label, in warm brass and ivory on leather.

The illustration is transparent over the page's existing texture. It adds no second paper surface, repeated site title, folio heading or schedule caption. The countdown uses lining, tabular numerals, with the phase above it. All ornament is live SVG markup styled by semantic CSS tokens, with self-hosted manuscript fonts.

In Ivory Vellum, sand drains from the upper bowl and collects in the lower bowl as the current period passes. Both levels follow the schedule rather than a separate animation, so returning to a sleeping tab shows the current levels immediately. Each new work or break period resets the hourglass. The countdown sits beside the glass on desktop and below it on phones. On phone viewports up to 672 px tall, compact vertical spacing keeps the countdown and next-period label visible below the header, preserving the illustration and numeral sizes. A short rule separates the next-period label. The approved light design is `outputs/light-timer-alternatives/scribes-hourglass.html`.

The two darker appearances keep their circular dials. The visible digits stay centered in the circle, and the next period sits below the dial. A thick progress arc stands apart from the fine ornamental lines. Twelve markers brighten, thicken and fill as the elapsed arc passes them clockwise, and reset at each new period. A brief transition respects reduced motion. Supplementary text and guide lines use stronger site ink for contrast. The original mockups in `outputs/timer-mockups/` record the earlier standalone designs.

The right sidebar mirrors the site's left panel: it docks over the page on wide screens, remembers whether it is docked, and opens as a modal drawer on phones. Escape closes a phone drawer and restores focus to its button; keyboard focus stays within the open drawer. Signed-out visitors have the same copy control. Setup also offers preferences; **Copy link** appears only for a running timer.

Appearance swatches are available in the left site panel and Settings, rather than the timer sidebar. Selecting one restyles both the page and the timer immediately, and saves the site's existing theme cookie. There is no separate timer choice; old `timer-appearance` local-storage values no longer affect rendering. The schedule and shared link stay unchanged.

## Others following

An open timer calls `reportTimerPresenceAction` as it opens, every minute and when its tab comes back into view. The `timer_presence` table keeps one row per account and schedule with the time of its last report. The answer counts the other accounts whose last report on the exact schedule is at most 2 minutes old, so several tabs of one account count once. Each report also deletes every row older than that.

Presence belongs to accounts, so a signed-out visitor's timer makes no report and shows no count; the action itself still requires a session.

The trail shows the count as **3 others here**, or **Unknown others** when a report fails. It shows nothing until the first report answers. It never shows a stale count or a made-up zero, and the countdown never waits for a report. The next report that succeeds shows the count again.

## Code

| Module | Holds |
| --- | --- |
| `src/timer/schedule.ts` | Presets, link parsing, phase arithmetic and the countdown's format |
| `src/timer/presence.ts` | Report interval, expiry and the count's shape |
| `src/timer/presence-store.ts` | The `timer_presence` table's reads and writes |
| `src/timer/presence-action.ts` | The Server Action the running timer calls |
| `src/components/timer/` | Setup, the running timer, its tools in the trail and the tab's remembered lengths |
