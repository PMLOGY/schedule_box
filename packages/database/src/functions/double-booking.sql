-- Double-booking prevention using exclusion constraint
-- Requires btree_gist extension for range overlap detection

-- Enable btree_gist extension for GIST exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add exclusion constraint to prevent overlapping bookings for the same employee
-- Uses tstzrange for timestamp range overlap detection with && operator
-- Excludes cancelled bookings from the constraint
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
    EXCLUDE USING GIST (
        employee_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    )
    WHERE (status <> 'cancelled');
