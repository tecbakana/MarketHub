import { Router, Request, Response } from 'express';
import { query } from '../db/schema';

const router: Router = Router();

router.use((req: Request, res: Response, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.MARKETHUB_SECRET) {
    res.status(401).json({ erro: 'Não autorizado' });
    return;
  }
  next();
});

router.get('/tenants-com-credenciais', async (_req: Request, res: Response): Promise<void> => {
  const rows = await query<{ tenant_id: string }>(
    'SELECT DISTINCT tenant_id FROM credenciais',
    [],
  );
  res.json(rows.map((r) => r.tenant_id));
});

export default router;
