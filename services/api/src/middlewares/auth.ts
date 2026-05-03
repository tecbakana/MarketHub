import { Request, Response, NextFunction } from 'express';
import { query } from '../db/schema';

export async function autenticar(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token não fornecido' });
    return;
  }

  const token = header.replace('Bearer ', '');

  const rows = await query<{ id: string }>('SELECT id FROM tenants WHERE token = $1', [token]);

  if (!rows.length) {
    res.status(401).json({ erro: 'Token inválido' });
    return;
  }

  (req as Request & { tenantId: string }).tenantId = rows[0].id;
  next();
}
