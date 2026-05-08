import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

export async function inicializarDb(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      secret TEXT NOT NULL,
      token TEXT
    );

    CREATE TABLE IF NOT EXISTS credenciais (
      tenant_id TEXT NOT NULL,
      marketplace TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      seller_id TEXT,
      access_token_expires_at TIMESTAMPTZ,
      refresh_token_expires_at TIMESTAMPTZ,
      auth_code TEXT,
      auth_code_expires_at TIMESTAMPTZ,
      PRIMARY KEY (tenant_id, marketplace)
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      marketplace TEXT NOT NULL,
      numero_pedido TEXT NOT NULL,
      data_pedido TEXT NOT NULL,
      status TEXT NOT NULL,
      status_nf TEXT NOT NULL DEFAULT 'nao_emitida',
      chave_nf TEXT,
      payload TEXT NOT NULL
    );
  `);

  await getPool().query(`
    ALTER TABLE credenciais ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ;
    ALTER TABLE credenciais ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMPTZ;
    ALTER TABLE credenciais ADD COLUMN IF NOT EXISTS auth_code TEXT;
    ALTER TABLE credenciais ADD COLUMN IF NOT EXISTS auth_code_expires_at TIMESTAMPTZ;
  `);
}
