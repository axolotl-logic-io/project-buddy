-- Accounts (accounts-and-quotas, 2026-10-12): every project now belongs to a
-- user, and the data saved before accounts belongs to no one, so it is
-- deleted (2026-10-11, see docs/Decisions-Accounts.md). Deleting the projects
-- deletes their chats, messages and memory versions by cascade. Failed logins
-- counted the old passphrase sign-in, which is gone. The next migration adds
-- the users and the projects' NOT NULL owner, which needs an empty projects
-- table.
DELETE FROM "projects";
--> statement-breakpoint
DELETE FROM "failed_logins";
