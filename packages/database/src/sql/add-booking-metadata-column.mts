/**
 * Migration: Add booking_metadata JSONB column to bookings table
 * Phase 49-02: Industry Verticals Foundation
 *
 * Run as postgres superuser since schedulebox user lacks ALTER TABLE in some environments.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const postgres = require('postgres') as (url: string, opts: { max: number }) => {
  unsafe: (sql: string) => Promise<unknown>;
  end: () => Promise<void>;
};

const url = 'postgresql://postgres:postgres@localhost:5432/schedulebox';
const sql = postgres(url, { max: 1 });

sql
  .unsafe(
    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_metadata jsonb DEFAULT NULL;`,
  )
  .then(() => {
    console.log('booking_metadata column added successfully');
    return sql.end();
  })
  .catch((e: Error) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
