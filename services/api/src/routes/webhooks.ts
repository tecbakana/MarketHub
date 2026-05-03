import { Router, Request, Response } from 'express';
import { query } from '../db/schema';

const router: Router = Router();

router.post('/spedy', async (req: Request, res: Response): Promise<void> => {
  const { event, data } = req.body;

  if (!event || !data) {
    res.status(400).json({ erro: 'Payload inválido' });
    return;
  }

  if (event === 'invoice.authorized') {
    await query(
      "UPDATE pedidos SET status_nf = 'emitida', chave_nf = $1 WHERE numero_pedido = $2",
      [data.id, data.order?.transactionId],
    );
  }

  if (event === 'invoice.rejected') {
    await query("UPDATE pedidos SET status_nf = 'erro' WHERE numero_pedido = $1", [
      data.order?.transactionId,
    ]);
  }

  res.json({ sucesso: true });
});

export default router;
