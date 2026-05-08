import { Router, Request, Response } from 'express';
import { query } from '../db/schema';
import { autenticar } from '../middlewares/auth';

const router: Router = Router();

router.use(autenticar);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = (req as Request & { tenantId: string }).tenantId;

  const rows = await query<{
    marketplace: string;
    seller_id: string;
    access_token: string;
    refresh_token: string;
    access_token_expires_at: string | null;
    refresh_token_expires_at: string | null;
  }>(
    `SELECT marketplace, seller_id, access_token, refresh_token,
            access_token_expires_at, refresh_token_expires_at
     FROM credenciais WHERE tenant_id = $1`,
    [tenantId],
  );

  res.json(rows.map((r) => ({
    marketplace: r.marketplace,
    sellerId: r.seller_id,
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    accessTokenExpiresAt: r.access_token_expires_at,
    refreshTokenExpiresAt: r.refresh_token_expires_at,
  })));
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = (req as Request & { tenantId: string }).tenantId;
  const { marketplace, accessToken, refreshToken, sellerId, accessTokenExpiresAt, refreshTokenExpiresAt } = req.body;

  if (!marketplace) {
    res.status(400).json({ erro: 'marketplace é obrigatório' });
    return;
  }

  const jaExiste = await query(
    'SELECT 1 FROM credenciais WHERE tenant_id = $1 AND marketplace = $2',
    [tenantId, marketplace],
  );

  if (!jaExiste.length && !accessToken) {
    res.status(400).json({ erro: 'accessToken é obrigatório para novo marketplace' });
    return;
  }

  if (jaExiste.length && !accessToken) {
    await query(
      `UPDATE credenciais SET
         seller_id = $1,
         refresh_token = COALESCE($2, refresh_token),
         refresh_token_expires_at = COALESCE($3, refresh_token_expires_at)
       WHERE tenant_id = $4 AND marketplace = $5`,
      [sellerId ?? null, refreshToken ?? null, refreshTokenExpiresAt ?? null, tenantId, marketplace],
    );
  } else {
    await query(
      `INSERT INTO credenciais
         (tenant_id, marketplace, access_token, refresh_token, seller_id,
          access_token_expires_at, refresh_token_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, marketplace) DO UPDATE SET
         access_token = $3,
         refresh_token = $4,
         seller_id = $5,
         access_token_expires_at = $6,
         refresh_token_expires_at = $7`,
      [tenantId, marketplace, accessToken, refreshToken ?? null, sellerId ?? null,
       accessTokenExpiresAt ?? null, refreshTokenExpiresAt ?? null],
    );
  }

  res.json({ sucesso: true });
});

router.delete('/:marketplace', async (req: Request, res: Response): Promise<void> => {
  const tenantId = (req as Request & { tenantId: string }).tenantId;
  const { marketplace } = req.params;

  await query(
    'DELETE FROM credenciais WHERE tenant_id = $1 AND marketplace = $2',
    [tenantId, marketplace],
  );

  res.json({ sucesso: true });
});

export default router;
