# Blender AI tutor: retrospectives

The orchestrator writes one entry after each stage's cleanup, before briefing the next stage (rule "Retrospective between stages" in [How the build runs](How-the-Build-Runs.md)). Newest first.

Each entry has:
- **What cost time:** failures, reruns, supervisor questions, wrong predictions in briefs or reports.
- **Code that keeps changing:** files changed again this stage after changing in earlier stages, from `git log --format= --name-only` across stage merges; candidates for a refactoring lane.
- **Rule changes,** applied to the plan and the next briefs:
  - removed;
  - modified;
  - added.
- **Refactors queued:** lanes added to the next stage, or "none".
- **Orchestrator's decisions this stage,** each with the question posed, the options and the choice, marked "Axlog can reverse".

---

## `chat-ui-and-mobile`, 2026-10-12

### What cost time
- **A known flake stayed open through all four lanes.** The chat visual shots failed now and then on `main` too (1 px of height, or a blank band under the composer). Three lanes spent runs on it and each asked the supervisor about it, until `visual-upkeep` fixed the settle step (`fit-screen.ts`: 5 of 60 shots failed before, 0 of 80 after). Fixing it first, alone, would have saved runs in every lane.
- **Supervisor questions: 12.** Most were real out-of-path edits named in no brief (the hide-rule layer, `biome.jsonc`'s `viewport`, `chat-thread.tsx`, `memory-history.tsx`, Streamdown's buttons, WebKit sign-in). The brief predicted the shared files but not the edits the lanes needed in them.
- **Two merge interactions** that no lane could see alone:
  - **`min-h-11` on Rename chat:** a spacing utility beat the role's `--target-size` and followed the theme.
  - **`mobile.spec.ts` measured Streamdown's off-screen buttons at 0×0** under load: one failed full run.
- **Reviewers found a bug the integration's probe missed:** switching off the pinned header sets it `static`, so its fade strip floats one screen down. The probe checked computed properties only; no test switches that flag.
- **Parallel lanes duplicated a helper being centralised.** `mobile-fixes` wrote the theme cookie by hand while `visual-upkeep` exported `themeChoiceCookie` for exactly that.
- **Smoke worker's shell slip** sent a stray "x" message (within the cap). The sweep report missed its exact final verdict line.
- **Bash-open alerts: 9,** all long test runs. Each cost a process check.
- **What went well:**
  - The merge-tree predictions matched every conflict exactly.
  - The Git deployment fired again (4 s).
  - 248/248 e2e twice on the merge.
  - Every screenshot reviewer said OK.
  - The device projects worked on their first review.

### Code that keeps changing
Commits since 2026-10-09 (non-merge):
- **`src/app/page-roles.css` 9, 290 lines:** roles for every page in one file. Every UI lane edits it.
  - **Watch:** accounts adds the account page's roles. If two round-3 or personas lanes need it at once, split it by page area (`page-roles.css` for the shared roles, chat-page roles beside `chat.css`).
- **`src/components/chat/chat.css` 7:** chat and Markdown roles. It churns with chat features.
- **`e2e/visual/visual-page.ts` 5:** settled now that `fit-screen.ts` holds the screen fit.
- **`src/components/site-header.tsx` 5:** 25 lines. Every stage adds a link. Accounts adds Account (and may hide links signed out). Small, so no split.
- **`src/tutor/reply.ts` 16:** untouched this stage. Re-measure after accounts, as planned.

### Rule changes
**Removed**
- **"Record the chat visual flake as an open risk" (option A):** the flake is fixed, so a failing visual shot is a failure again.

**Modified**
- **Touch targets:** sized through `--target-size`, never spacing utilities. Recorded under "Patterns the rules force".
- **Interaction probes check what the user sees.** A known-interactions step in the integration brief also takes a screenshot or a `click({trial:true})` check, not only computed styles.
- **Section C's report** must end with the exact line `Sweep verdict: OK` or `Sweep verdict: BROKEN`. The after-merge workflow passes the sweep's verdict into its return value.

**Added**
- **Each extra's off state has a browser test,** written by the lane that builds or tags the extra. The rule is in `common.md` for accounts and personas; it came from design M1.
- **Helpers centralised in a stage replace parallel copies at merge.** The integration brief lists the helpers each lane exports for others (`themeChoiceCookie`, `manualSection`, `PHONE_VIEWPORT`). The integration worker converts any parallel lane's hand-written copy, as a merge fix.
- **A known flake is fixed first, alone,** before the lanes that would trip on it start, or in round 1 of the stage.

Balance: 1 removed, 3 modified, 3 added.

### Refactors queued
- **`chat-ui-followups`** (accounts round 1, beside `accounts-core` and `use-cases-accounts`):
  - pinned-header off state (design M1, rules M1);
  - typed `extraTag` and the tag test (design M2);
  - `mobile.spec.ts` on the shared helpers (design M3, rules L2);
  - the untested use-case promises (rules M2);
  - Lows: design L2, L4, L5; rules L3; README's page lists (design L1); `use_case_use_on_phone` naming Settings.
- **Into `account-page-and-flags`:**
  - design L3: decide on a shared "choice" helper (cookie, pre-paint lookup, `<html>` observer) once flags store per user;
  - design L6: seed the cookie at sign-in with `hiddenFlagsCookie`;
  - the signed-out Settings link.

### Measured
- **Smoke reply cache:** `cacheRead` 39.6k, `cacheWrite` 7.5k of 47.2k input. The reply searched 5 times, so the input was bigger than `lane-splitting`'s 26k.
- **Opening:** 3.55 s, down from 4.9 s.

### Orchestrator's decisions this stage (Axlog can reverse)
All are recorded in the plan under `chat-ui-and-mobile` ("Supervisor approvals" and the after-merge notes), each with the question posed and the rejected options:
- the hide rules in a last cascade layer `extras`;
- the failed-tool tag in `chat-parts.tsx`;
- `manualSection` shared in `e2e/chat-page.ts`;
- `chat-composer-dock`;
- the `viewport` export allowed in `biome.jsonc`;
- `PHONE_VIEWPORT` in `e2e/viewports.ts`;
- Rename chat unpinned;
- the memory mask class;
- Streamdown's buttons at 1.5rem;
- WebKit sign-in by minted cookie;
- hidden chat names as a split link;
- at merge, Rename chat on `--target-size`;
- at merge, `mobile.spec.ts` measuring each control on screen;
- the chat name clamped to one line on phones;
- the follow-up fixes as a third round-1 lane in accounts, rather than waiting for `deploy-v1` (the off-state bug is live in production, and round 3 adds an extra that needs the typed tag).

---

## `lane-splitting` (and `persona-tweaks`), 2026-10-12

### What cost time
- **A lane ended its run on a failed check.** `visual-baselines`' first run stopped when `biome check` failed (`useValidTestTitle` on a template-literal title), with nothing committed; it needed a resume. The fix was ordinary; the cost was the stopped run.
- **A wrong "merges cleanly" prediction.** `copy-per-area`'s report predicted no conflict in `site-header.tsx`; theme-polish's edit on the adjacent line conflicted. It cost one supervisor round trip. Reports guessed by reading diffs rather than testing the merge.
- **A brief bug.** The after-merge brief's pathspec `':!e2e/visual/*-snapshots'` didn't exclude the PNGs; the worker caught it and asked.
- **Deployment.** The push produced no Git deployment at all; the CLI fallback ran. The smoke worker noticed that `vercel deploy` from the repo would upload `.env` and `.env.test` (the CLI ignores only `.env.local` by default) and deployed from a clean worktree. Good judgement, but nothing in the brief protected against it.
- **`/reload` stopped the workflow controller.** The child kept running; relaunching the same script re-attached. No work lost.
- **Bash-open alerts** (three) were all long test runs. Each cost a check.
- **One secret leak into a tool output:** the integration worker printed `.env.test`'s test-only passphrase while reading the file. Not copied anywhere.
- **What went well:** the visual baselines replaced throwaway screenshot scripts and pixel comparisons in one stage; reviewers used them directly; e2e 147/147 twice; the five-branch merge with an old-base branch (theme-polish) needed no spec fixes.

### Code that keeps changing
Commits touching each file since 2026-10-09 (non-merge, `src` and `e2e`):
- `src/ui/copy.ts` 18: **resolved** by `copy-per-area`.
- `src/tutor/reply.ts` 16, `reply-test-kit.ts` 10, `reply.test.ts` 10: every reply-touching lane edits them. 287 lines; not oversized, but it is the hottest file and `multi-persona-chats` will reshape it. **Watch**: re-measure after `accounts-and-quotas`; if accounts lanes also edit it, queue a split (request parsing / streaming and saving / step logging) before `multi-persona-chats`.
- `src/components/chat-view.test.tsx` 16: 263 lines, 3 describes. Churn follows chat features; no split yet.
- `src/components/new-chat-form.tsx` 15, `new-project-form.tsx` 13: persona-picker churn; `persona-editor` and `multi-persona-chats` replace most of it.
- `src/tutor/system-prompt.ts` 12, its test 13, `src/personas/personas.test.ts` 13: **queued** as `persona-parts-move` (round 1 of `personas-and-prompts`).
- `src/chats/store.ts` 11: `persona-store` rewires it.

### Rule changes
**Removed**
- "Lanes save screenshots; fresh agents view them", throwaway screenshot scripts and script pixel comparisons (with the RGB note): replaced by the visual baselines.
- The 175k "commit, hand off and end" rule and the `context-handoff` add-on: replaced by compaction at 175k (Axlog).
- "A fresh session per stage": one long session with compaction (Axlog).
- The `visual-baselines` lane's "don't import `COPY`" limit: it ended with the merge.

**Modified**
- **Conflict predictions are tested, not guessed.** The integration worker's first step runs `git merge-tree --write-tree` for each branch against the merge so far, in order, and lists the predicted conflicts before merging; lane reports stop predicting merges.
- **Deploy fallback** only from a clean worktree of the pushed commit; `chat-ui-and-mobile` adds a `.vercelignore` with `.env*`.
- **Diffs that exclude a folder** use `':!<dir>/**'`.
- **Secrets:** briefs add "never print `.env*` files; read single variables with `node --env-file` or `grep -c`".

**Added**
- **A failing check isn't the end of a run.** Common brief line: "A failing command is information. Fix it within your rules, or ask with `contact_supervisor`; never end your run on a failed check."
- **Visual pages wait for a settled page and real masks.** `describeVisualPage` waits until no loading skeleton (`aria-busy`) remains, and asserts every mask locator matches at least one element (rules R-L2; the skeleton baselines).
- **Mobile is reviewed every stage** (Axlog): device projects in the visual tests and a mobile reviewer.

Balance: 4 removed, 4 modified, 3 added.

### Refactors queued (into `chat-ui-and-mobile`)
- `theme-choice.ts` exports the cookie form (`themeChoiceCookie`) and `visual-page.ts` uses it (design M2, rules R-L1).
- Visual specs import copy modules; masks built from copy; non-empty mask assertion; settled-page wait; shared `manualSection` (rules R-L2, R-L3, design L2, L3).
- `themes.ts` "ADDING A THEME" step 5 (design M1).
- CSS roughs: memory milestones' double marker and hanging indent; the checkbox gap on the spacing unit (R-L4); the composer's backdrop at 390; dark skeleton colour.
- `.vercelignore`.
- Left for `accounts-and-quotas` (it owns `use-cases/`): design L4 (README wording), L5 (tighter slug check).

### Measured
- Smoke reply cache: `cacheRead` 19.7k, `cacheWrite` 6.3k of 26.0k input. The baseline for `personas-and-prompts`' cache-cost check.

### Orchestrator's decisions this stage (Axlog can reverse)
- **`site-header.tsx` conflict:** take theme-polish's side, then convert `COPY` (rejected: hand-merging the two lines). Standing rule for the same pattern.
- **Diff pathspec:** `':!e2e/visual/*-snapshots/**'`.
- **Compaction numbers:** `reserveTokens` 825000 for Opus 5.5 (trigger at 175k, matching the old limit), `keepRecentTokens` 30000 (rejected: the default 20000, a little short for lane state).
- **Stage order:** `chat-ui-and-mobile` before accounts (rejected: beside accounts, because the pages overlap).
- **Request details** for personas, prompt parts, multi-persona chats, the interview, flags, the pinned header and mobile: all recorded in `personas-and-prompts-rulings` and `chat-ui-flags-and-mobile`, each with the question posed and rejected options.
- **Mobile checks added to the running sweep** before it started.
