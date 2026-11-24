-- Lists no longer have their own check-off and uncheck verbs. The build
-- that is live while this migrates still reads and writes them, so they
-- stay for one release with defaults for the lists the new build makes.
-- The next release drops them.
ALTER TABLE "lists" ALTER COLUMN "check_off" SET DEFAULT 'Complete';--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "uncheck" SET DEFAULT 'Reopen';
