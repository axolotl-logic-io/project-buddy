# Blender AI tutor

## Goal

Project Buddies is a personal website that teaches Blender through each user's own projects. A project collects goals, milestones, progress and preferences in shared memory. Each project chat pairs that project with one buddy: a character with its own written voice. Standalone chats, in no project, let the user explore an idea without choosing or creating a project. The tutor searches the official Blender Reference Manual and cites the sections it uses. The site runs on Vercel. Owner: Axlog.

## Version 1 acceptance criteria

These criteria define the product, not a claim that production validation is complete:

- Admins invite one email address from the signed-in Invitations page, linked from Account. The initial admin is `me@modestprogress.com`, provisioned or promoted without a session; its owner still proves ownership through normal emailed-link sign-in. Other users cannot administer invitations, and the admin role grants no access to their private data.
- New recipients open an email-bound setup link and confirm once to create an ordinary account and sign in at home. Opening alone is read-only. Setup links last 30 minutes and are single-use, including under concurrent acceptance; successfully replacing an unaccepted invitation invalidates its old link. Public shared-code sign-up is retired. Inviting an existing address sends its normal login link without changing its account.
- Existing users retain normal passwordless sign-in: emailed links work repeatedly for 30 minutes, require confirmation, and preserve the non-disclosing response, request limits, 30-day sessions and sign-out behavior. Protected pages and API routes require a valid session.
- Each user's data is private, with a $5 monthly Claude quota.
- Creating a project starts an interview chat that writes goals and milestones to project memory.
- A project chat uses the chosen project and buddy, receives the project's memory, and can be reopened. Built-in buddies are Hippy, Mr. Tee, Fjord Tines, Span Tines, Argon Sprangler and Roland Dustchain.
- Users can clone and edit buddies as text.
- The tutor searches the latest stable manual; factual Blender claims cite real manual sections. The indexed branch lives in `apps/web/src/manual/manual-source.ts`, and one command rebuilds the index for a new stable release.
- The tutor updates project memory during chats. The user can view, edit and undo changes.
- Haiku names chats until the user renames them.
- Every use case in `apps/web/use-cases/` has a passing test.

Standalone chats and their `create_project` tool are described in [Chats](chats.md). They have no project memory and create no project unless the user asks.

## Sources and workflow

- **Rules:** [project practices](project-practices.md).
- **Commands:** the repo's `README.md`; additional observations are in [Site operations](Site-Operations.md).
- **Work and status:** [GitHub issues](https://github.com/axolotl-logic-io/project-buddy/issues). This page is not a second backlog.
- **Implementation:** the issue pipeline in the [ecosystem repository](https://github.com/axolotl-logic-io/ecosystem) works this repo's issues; its docs are in that repository's `docs/` folder. A merge to `integration` deploys a preview only. Production releases are manual, through `scripts/deploy.sh` and the release workflow.
- **Decisions:** choices, failed gates and rule conflicts go to Axlog with options and a recommendation.
- **Safety:** agents must never connect to the production database, print a `.env*` file or run real Claude. Production, Preview and Development share one Neon database; tests use a separate database and the mock tutor.

## Production validation gap

The question `production-check-after-merge` is still open: should production get a cheap check after each merge, or only a maintainer-run real-Claude smoke test? Merges no longer reach production, since releases are manual. The release workflow's smoke test covers signed-out requests only; it doesn't check tutor replies or prompt caching.

Each release's smoke test should record `cacheRead` and `cacheWrite` for an edited buddy. [Issue #37](https://github.com/axolotl-logic-io/project-buddy/issues/37) records the proposed real-Claude and theme checks, including watching for short citing steps and uncited step-limit answers. It was closed as maintainer-only release work, not because the checks passed, and nothing records that they have.
