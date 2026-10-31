-- Invitations stop expiring in #594. The build before it still writes
-- expires_at and reads it, so the column stays for now; a later release drops
-- it. This only lets new rows leave it empty.
ALTER TABLE "invitations" ALTER COLUMN "expires_at" DROP NOT NULL;
--> statement-breakpoint

-- Invitations that expired before #594 stay unusable: without this, they
-- would work again once the new build stops checking expires_at.
DELETE FROM "active_invitations" a
USING "invitations" i
WHERE i."token_hash" = a."token_hash" AND i."expires_at" <= now();
