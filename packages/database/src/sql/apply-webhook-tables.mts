import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../../.env') });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const postgres = require('postgres') as (url: string, opts: { max: number }) => {
  unsafe: (sql: string) => Promise<unknown>;
  end: () => Promise<void>;
};
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');
const sql = postgres(url, { max: 1 });
const sqlContent = readFileSync(resolve(__dirname, 'webhook-config-tables.sql'), 'utf-8');

sql.unsafe(sqlContent)
  .then(() => {
    console.log('Webhook tables created successfully');
    return sql.end();
  })
  .catch((e: Error) => { console.error('Error:', e.message); process.exit(1); });
