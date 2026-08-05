-- ─── Auditoría WORM · InvoiceShield ───────────────────────────────────
-- audit_logs es una tabla append-only. Cualquier UPDATE/DELETE/TRUNCATE
-- directo es rechazado a nivel de base de datos (los triggers lo bloquean).

CREATE OR REPLACE FUNCTION prevent_audit_logs_write()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (WORM). UPDATE/DELETE/TRUNCATE not allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_no_update_delete ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_logs_write();

DROP TRIGGER IF EXISTS trg_audit_logs_no_truncate ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_truncate
  AFTER TRUNCATE ON audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_logs_write();

REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC;
