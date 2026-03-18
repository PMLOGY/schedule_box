/**
 * Migration: Add booking_metadata JSONB column to bookings table
 * Phase 49-02: Industry Verticals Foundation
 */
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import type { Sql } from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const postgresFactory = require('postgres') as (url: string, opts: { max: number }) => Sql;
// Use postgres superuser — schedulebox user may lack ALTER TABLE in some environments
const superuserUrl = 'postgresql://postgres:postgres@localhost:5432/schedulebox';
const client = postgresFactory(superuserUrl, { max: 1 });

(async () => {
  try {
    await client.unsafe(
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_metadata jsonb DEFAULT NULL;`,
    );
    console.log('booking_metadata column added successfully');
    // Verify
    const rows = await client.unsafe(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'booking_metadata';`,
    );
    console.log('Column verified:', rows);
  } catch (e) {
    console.error('Error:', (e as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
