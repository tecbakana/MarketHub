import { config } from 'dotenv';
config({ path: '../../.env' });
import { resolve } from 'path';
console.log('Caminho .env:', resolve('../../.env'));

//import de arquivos
import { MarketplaceAggregator } from './MarketplaceAggregator';
import { MessagePublisher } from './MessagePublisher';
import { SyncJob } from './SyncJob';
import { MercadoLivreConnector } from '@markethub/connector-mercadolivre';

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://markethub:markethub123@localhost:5672';
const INTERVAL = parseInt(process.env.SYNC_INTERVAL_MINUTES ?? '15');

async function main(): Promise<void> {
  const publisher = new MessagePublisher();
  await publisher.conectarAsync(RABBITMQ_URL);

  const connectors = [new MercadoLivreConnector()];
  const aggregator = new MarketplaceAggregator(connectors);

  const job = new SyncJob(aggregator, publisher, INTERVAL);
  job.iniciar();

  process.on('SIGINT', async () => {
    job.parar();
    await publisher.fecharAsync();
    process.exit(0);
  });
}

main().catch(console.error);
