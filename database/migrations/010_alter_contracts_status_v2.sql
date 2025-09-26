-- Migration: Extend contracts.status to support new statuses

DO $$
BEGIN
  BEGIN
    ALTER TABLE contracts DROP CONSTRAINT contracts_status_check;
  EXCEPTION WHEN undefined_object THEN
    PERFORM 1;
  END;
END$$;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (
    status IN (
      'draft',
      'in_progress',
      'to_sign',
      'active',
      'inactive',
      'archived',
      'cancelled'
    )
  );


