import express from 'express';
import { config } from 'dotenv';
import { inicializarDb } from './db/schema';
import authRoutes from './routes/auth';
import pedidosRoutes from './routes/pedidos';
import configuracoesRoutes from './routes/configuracoes';
import webhooksRoutes from './routes/webhooks';

config({ path: '../../.env' });

const app = express();
const PORT = process.env.API_PORT ?? 4000;

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/pedidos', pedidosRoutes);
app.use('/configuracoes', configuracoesRoutes);
app.use('/webhooks', webhooksRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

inicializarDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[API] MarketHub rodando na porta ${PORT}`);
    });
  })
  .catch(console.error);
