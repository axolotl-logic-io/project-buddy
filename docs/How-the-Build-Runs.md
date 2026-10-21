# Historical staged build

This page describes the staged-build process used before the [issue pipeline](https://github.com/axolotl-logic-io/ecosystem). It is not an operating manual. Axlog retired the staged plan on 2026-10-12; current work belongs in GitHub issues, current rules in [coding practices](coding-practices.md) and [project practices](project-practices.md), and pipeline commands in [Running the issue pipeline](https://github.com/axolotl-logic-io/ecosystem).

## How the build runs

The retired process used a coordinating session and short-lived agents:

1. The coordinator maintained the plan, stage briefs and retrospective log. Axlog approved the work and decided design choices, failed gates and rule conflicts.
2. Workers implemented parallel lanes in separate worktrees. Lanes were grouped by shared context and conflict risk, with explicit owned paths. Moves and shared-schema changes ran separately from dependent work.
3. An integration worker merged each round, regenerated visual baselines and ran the checks. Fresh agents reviewed screenshots before a push, then handled the authorised release and smoke checks.
4. Read-only reviewers checked the integrated diff for design and rule violations. Their findings became work for the next stage.
5. Each stage ended with a retrospective and a condensed outcome in the plan. Briefs and reports retained the detailed evidence.

This process used local `main` merges and stage-specific release steps. Do not reuse those instructions: PRs now target `integration`, production releases are manual, and agents must never connect to the production database or run real Claude.

## Agent roles

The staged build used scouts for shared code context, researchers for external documentation, evidence auditors for consequential research claims, workers for all changes, reviewers for read-only checks, and an oracle for questions touching existing decisions. Follow-up work received a fresh worker and the previous report rather than reopening a completed lane.

These historical roles are not the pipeline's roles. See [Pipeline roles](https://github.com/axolotl-logic-io/ecosystem) for the current boundaries and state machines.

## Key decision

### `delegated-staged-build`

From 2026-10-10, short-lived agents built the system in staged parallel lanes while the main session maintained the plan (Axlog). [`plan-retired`](Blender-AI-Tutor.md#plan-retired) superseded this process.

## Historical evidence

Stage briefs and reports were stored under `../project-buddy-worktrees/`, including `accounts-briefs/` and `chat-ui-and-mobile-briefs/`. [Retrospectives](Retrospectives.md) preserves the stage lessons. The full former handoff (wiki commit `b3503d5ef26ae8e52dd843afe9a0533823a73876`) remains in wiki history; its agent settings, commands and production assumptions are historical, not current requirements.
