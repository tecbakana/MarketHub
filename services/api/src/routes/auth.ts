import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/schema';

const router: Router = Router();

router.post('/token', async (req: Request, res: Response): Promise<void> => {
  const { tenantId, secret } = req.body;

  if (!tenantId || !secret) {
    res.status(400).json({ erro: 'tenantId e secret são obrigatórios' });
    return;
  }

  const rows = await query<{ id: string }>(
    'SELECT id FROM tenants WHERE id = $1 AND secret = $2',
    [tenantId, secret],
  );

  if (!rows.length) {
    const masterSecret = process.env.MARKETHUB_SECRET ?? '';
    if (!masterSecret || secret !== masterSecret) {
      res.status(401).json({ erro: 'Credenciais inválidas' });
      return;
    }
    await query('INSERT INTO tenants (id, secret) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET secret = $2', [tenantId, secret]);
  }

  const token = uuidv4();

  await query('UPDATE tenants SET token = $1 WHERE id = $2', [token, tenantId]);

  res.json({ token });
});

export default router;
