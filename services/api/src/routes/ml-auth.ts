import { Router, Request, Response } from 'express';
import axios from 'axios';
import { query } from '../db/schema';

const router: Router = Router();

const ML_ACCESS_TOKEN_TTL_S = 21600;    // 6 horas
const ML_REFRESH_TOKEN_TTL_S = 15552000; // 6 meses

router.use((req: Request, res: Response, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.MARKETHUB_SECRET) {
    res.status(401).json({ erro: 'Não autorizado' });
    return;
  }
  next();
});

router.get('/auth-url', (req: Request, res: Response): void => {
  const { tenantId } = req.query;
  if (!tenantId) {
    res.status(400).json({ erro: 'tenantId é obrigatório' });
    return;
  }

  const clientId = process.env.ML_CLIENT_ID ?? '';
  const redirectUri = process.env.ML_REDIRECT_URI ?? '';

  if (!clientId || !redirectUri) {
    res.status(500).json({ erro: 'ML_CLIENT_ID ou ML_REDIRECT_URI não configurados' });
    return;
  }

  const url =
    `https://auth.mercadolivre.com.br/authorization` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${tenantId}`;

  res.json({ url });
});

router.post('/exchange-code', async (req: Request, res: Response): Promise<void> => {
  const { code, tenantId } = req.body;

  if (!code || !tenantId) {
    res.status(400).json({ erro: 'code e tenantId são obrigatórios' });
    return;
  }

  const clientId = process.env.ML_CLIENT_ID ?? '';
  const clientSecret = process.env.ML_CLIENT_SECRET ?? '';
  const redirectUri = process.env.ML_REDIRECT_URI ?? '';

  const now = new Date();
  const codeExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // codes expiram em ~10 min

  await query(
    `INSERT INTO credenciais (tenant_id, marketplace, access_token, auth_code, auth_code_expires_at)
     VALUES ($1, 'mercadolivre', '', $2, $3)
     ON CONFLICT (tenant_id, marketplace) DO UPDATE SET
       auth_code = $2,
       auth_code_expires_at = $3`,
    [tenantId, code, codeExpiresAt],
  );

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const mlRes = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
  });

  const { access_token, refresh_token, expires_in, user_id } = mlRes.data;
  const accessExpiresAt = new Date(now.getTime() + (expires_in ?? ML_ACCESS_TOKEN_TTL_S) * 1000);
  const refreshExpiresAt = new Date(now.getTime() + ML_REFRESH_TOKEN_TTL_S * 1000);

  await query(
    `INSERT INTO credenciais
       (tenant_id, marketplace, access_token, refresh_token, seller_id,
        access_token_expires_at, refresh_token_expires_at)
     VALUES ($1, 'mercadolivre', $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, marketplace) DO UPDATE SET
       access_token = $2,
       refresh_token = $3,
       seller_id = $4,
       access_token_expires_at = $5,
       refresh_token_expires_at = $6`,
    [tenantId, access_token, refresh_token, String(user_id), accessExpiresAt, refreshExpiresAt],
  );

  res.json({
    sucesso: true,
    sellerId: user_id,
    accessTokenExpiresAt: accessExpiresAt,
    refreshTokenExpiresAt: refreshExpiresAt,
  });
});

export { ML_ACCESS_TOKEN_TTL_S, ML_REFRESH_TOKEN_TTL_S };
export default router;
