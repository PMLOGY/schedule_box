-- Add 'expired' to bookings_status_check constraint
-- The application state machine supports pending -> expired transitions
-- but the original CHECK constraint omitted this status.
-- This is idempotent: drops the old constraint if it exists and recreates it.

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'expired'));
