-- Published site versions are an audit trail and the source for rollback: once written they
-- must never change. Drafts stay mutable, and a row can never switch between draft and published.
-- Deletes stay allowed so account deletion can cascade. The one permitted update is the
-- created_by foreign key being nulled when the author's account is deleted.
CREATE OR REPLACE FUNCTION site_version_guard_update() RETURNS trigger AS $$
BEGIN
  IF NEW.kind <> OLD.kind THEN
    RAISE EXCEPTION 'site version kind cannot change (id=%)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF OLD.kind = 'published'
    AND NOT (
      NEW.created_by IS NULL
      AND (to_jsonb(NEW) - 'created_by') = (to_jsonb(OLD) - 'created_by')
    ) THEN
    RAISE EXCEPTION 'published site versions are immutable (id=%)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER site_version_guard_update
  BEFORE UPDATE ON site_version
  FOR EACH ROW EXECUTE FUNCTION site_version_guard_update();
