import { config } from 'dotenv';
import { inicializarDb, query } from './db/schema';

config({ path: '../../.env' });

async function seed(): Promise<void> {
  await inicializarDb();

  const secret = 'secret-teste-123';
  const ids = process.argv[2]
    ? [process.argv[2]]
    : ['tenant-teste'];

  for (const tenantId of ids) {
    await query(
      'INSERT INTO tenants (id, secret) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
      [tenantId, secret],
    );
    console.log('Tenant criado:', tenantId);
  }
}

seed().catch(console.error);
