-- Migration: Extend projects.status to new set

DO $$
BEGIN
  BEGIN
    ALTER TABLE projects DROP CONSTRAINT projects_status_check;
  EXCEPTION WHEN undefined_object THEN
    PERFORM 1;
  END;
END$$;

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (
    status IN (
      'draft',
      'in_progress',
      'active',
      'completed',
      'cancelled',
      'inactive',
      'archived'
    )
  );


