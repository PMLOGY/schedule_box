import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { config } from 'dotenv';
import type { Sql } from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

config({ path: resolve(__dirname, '../../../../.env') });

const postgresFactory = require('postgres') as (url: string, opts: { max: number }) => Sql;
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');
const client = postgresFactory(url, { max: 1 });
const sqlContent = readFileSync(resolve(__dirname, 'webhook-config-tables.sql'), 'utf-8');

(async () => {
  try {
    await client.unsafe(sqlContent);
    console.log('Webhook tables created successfully');
  } catch (e) {
    console.error('Error:', (e as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
