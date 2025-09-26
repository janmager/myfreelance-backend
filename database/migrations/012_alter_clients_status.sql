DO $$
BEGIN
  BEGIN
    ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
  EXCEPTION WHEN undefined_object THEN
    PERFORM 1;
  END;
END$$;

ALTER TABLE clients
  ADD CONSTRAINT clients_status_check
  CHECK (
    status IN ('active', 'inactive', 'archived')
  );


