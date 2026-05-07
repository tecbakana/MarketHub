import { Router, Request, Response } from 'express';
import { query } from '../db/schema';
import { autenticar } from '../middlewares/auth';
import { PedidoConsolidado } from '@markethub/core';
import { SpedyEmissor } from '@markethub/emitter-spedy';

const router: Router = Router();

//autenticador
router.use(autenticar);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = (req as Request & { tenantId: string }).tenantId;

  const rows = await query<{ payload: string }>(
    'SELECT payload FROM pedidos WHERE tenant_id = $1 ORDER BY data_pedido DESC',
    [tenantId],
  );

  res.json(rows.map((r) => JSON.parse(r.payload)));
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const tenantId = (req as Request & { tenantId: string }).tenantId;
  const { id } = req.params;

  const rows = await query<{ payload: string; status_nf: string; chave_nf: string }>(
    'SELECT payload, status_nf, chave_nf FROM pedidos WHERE id = $1 AND tenant_id = $2',
    [id, tenantId],
  );

  if (!rows.length) {
    res.status(404).json({ erro: 'Pedido não encontrado' });
    return;
  }

  const pedido = JSON.parse(rows[0].payload) as PedidoConsolidado;
  pedido.statusNF = rows[0].status_nf as PedidoConsolidado['statusNF'];
  pedido.chaveNF = rows[0].chave_nf;

  res.json(pedido);
});

router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const pedidos: PedidoConsolidado[] = req.body;

  if (!Array.isArray(pedidos)) {
    res.status(400).json({ erro: 'Array de pedidos esperado' });
    return;
  }

  for (const pedido of pedidos) {
    await query(
      `INSERT INTO pedidos (id, tenant_id, marketplace, numero_pedido, data_pedido, status, status_nf, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         status = $6,
         status_nf = $7,
         payload = $8`,
      [
        pedido.id,
        pedido.tenantId,
        pedido.marketplace,
        pedido.numeroPedido,
        pedido.dataPedido,
        pedido.status,
        pedido.statusNF,
        JSON.stringify(pedido),
      ],
    );
  }

  res.json({ sucesso: true, total: pedidos.length });
});

router.post('/:id/emitir-nf', async (req: Request, res: Response): Promise<void> => {
  const tenantId = (req as Request & { tenantId: string }).tenantId;
  const { id } = req.params;

  const rows = await query<{ payload: string }>(
    'SELECT payload FROM pedidos WHERE id = $1 AND tenant_id = $2',
    [id, tenantId],
  );

  if (!rows.length) {
    res.status(404).json({ erro: 'Pedido não encontrado' });
    return;
  }

  const pedido = JSON.parse(rows[0].payload) as PedidoConsolidado;
  pedido.dataPedido = new Date(pedido.dataPedido);

  const emitter = new SpedyEmissor({
    apiKey: process.env.SPEDY_API_KEY ?? '',
    sandbox: process.env.SPEDY_SANDBOX === 'true',
  });

  await query("UPDATE pedidos SET status_nf = 'emitindo' WHERE id = $1", [id]);

  const resultado = await emitter.emitirAsync(pedido);

  if (resultado.sucesso) {
    await query("UPDATE pedidos SET status_nf = 'emitida', chave_nf = $1 WHERE id = $2", [
      resultado.chaveNF,
      id,
    ]);
  } else {
    await query("UPDATE pedidos SET status_nf = 'erro' WHERE id = $1", [id]);
  }

  res.json(resultado);
});

export default router;
