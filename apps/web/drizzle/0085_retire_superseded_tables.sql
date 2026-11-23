-- Retire these tables from the application schema. Keep their physical
-- tables for the deployment that is live while migrations run. A separate
-- release can drop them after the new code has been promoted.
SELECT 1;
