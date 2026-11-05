-- Destination foreign keys release grants. Retained snapshots keep their own
-- grants; bytes disappear only when the last destination releases them.
CREATE FUNCTION collect_construct_asset() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM construct_assets
  WHERE id = OLD.asset_id
    AND NOT EXISTS (SELECT 1 FROM construct_asset_grants WHERE asset_id = OLD.asset_id);
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER collect_construct_asset_after_grant
AFTER DELETE ON construct_asset_grants
FOR EACH ROW EXECUTE FUNCTION collect_construct_asset();
