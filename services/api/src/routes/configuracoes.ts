import { Router, Request, Response } from 'express';
import { query } from '../db/schema';
import { autenticar } from '../middlewares/auth';

const router: Router = Router();

router.use(autenticar);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = (req as Request & { tenantId: string }).tenantId;

  const rows = await query<{ marketplace: string; seller_id: string; access_token: string; refresh_token: string }>(
    'SELECT marketplace, seller_id, access_token, refresh_token FROM credenciais WHERE tenant_id = $1',
    [tenantId],
  );

  res.json(rows.map((r) => ({
    marketplace: r.marketplace,
    sellerId: r.seller_id,
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
  })));
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = (req as Request & { tenantId: string }).tenantId;
  const { marketplace, accessToken, refreshToken, sellerId } = req.body;

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
      `UPDATE credenciais SET seller_id = $1, refresh_token = COALESCE($2, refresh_token)
       WHERE tenant_id = $3 AND marketplace = $4`,
      [sellerId ?? null, refreshToken ?? null, tenantId, marketplace],
    );
  } else {
    await query(
      `INSERT INTO credenciais (tenant_id, marketplace, access_token, refresh_token, seller_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, marketplace) DO UPDATE SET
         access_token = $3,
         refresh_token = $4,
         seller_id = $5`,
      [tenantId, marketplace, accessToken, refreshToken ?? null, sellerId ?? null],
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
