import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import type { Sql } from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

config({ path: resolve(__dirname, '../../../../.env') });

const postgresFactory = require('postgres') as (url: string, opts: { max: number }) => Sql;
const url = 'postgresql://postgres:postgres@localhost:5432/schedulebox';
const client = postgresFactory(url, { max: 1 });

const grantSql = `
GRANT ALL PRIVILEGES ON TABLE webhook_endpoints TO schedulebox;
GRANT ALL PRIVILEGES ON TABLE webhook_deliveries TO schedulebox;
GRANT USAGE, SELECT ON SEQUENCE webhook_endpoints_id_seq TO schedulebox;
GRANT USAGE, SELECT ON SEQUENCE webhook_deliveries_id_seq TO schedulebox;
`;

(async () => {
  try {
    await client.unsafe(grantSql);
    console.log('Grants applied successfully');
  } catch (e) {
    console.error('Error:', (e as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
