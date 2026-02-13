-- Double-booking prevention using exclusion constraint
-- Requires btree_gist extension for range overlap detection

-- Enable btree_gist extension for GIST exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Idempotent: add exclusion constraint only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_bookings') THEN
        ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
            EXCLUDE USING GIST (
                employee_id WITH =,
                tstzrange(start_time, end_time) WITH &&
            )
            WHERE (status <> 'cancelled');
    END IF;
END;
$$;
