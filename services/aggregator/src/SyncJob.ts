import axios from 'axios';
import { CredencialMarketplace } from '@markethub/core';
import { MarketplaceAggregator } from './MarketplaceAggregator';
import { MessagePublisher } from './MessagePublisher';

console.log('API_TOKEN carregado:', process.env.API_TOKEN ? 'sim' : 'não');

export class SyncJob {
  private intervalId?: NodeJS.Timeout;

  constructor(
    private readonly aggregator: MarketplaceAggregator,
    private readonly publisher: MessagePublisher,
    private readonly intervalMinutes: number,
  ) {}

  iniciar(): void {
    console.log(`[SyncJob] Iniciando varredura a cada ${this.intervalMinutes} minuto(s)`);
    this.executarAsync();
    this.intervalId = setInterval(() => this.executarAsync(), this.intervalMinutes * 60 * 1000);
  }

  parar(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private async refreshMlToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
      params: {
        grant_type: 'refresh_token',
        client_id: process.env.ML_CLIENT_ID,
        client_secret: process.env.ML_CLIENT_SECRET,
        refresh_token: refreshToken,
      },
    });
    return { accessToken: res.data.access_token, refreshToken: res.data.refresh_token };
  }

  private async obterTokenAsync(apiUrl: string, tenantId: string): Promise<string> {
    const secret = process.env.MARKETHUB_SECRET ?? '';
    const res = await axios.post(`${apiUrl}/auth/token`, { tenantId, secret });
    return res.data.token as string;
  }

  private async executarAsync(): Promise<void> {
    const API_URL = process.env.API_URL ?? 'http://localhost:4000';
    const TENANT_ID = process.env.TENANT_ID ?? 'tenant-teste';
    console.log(`[SyncJob] Iniciando varredura — ${new Date().toISOString()}`);
    try {
      const API_TOKEN = await this.obterTokenAsync(API_URL, TENANT_ID);

      const response = await axios.get(`${API_URL}/configuracoes`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });

      const credenciais = new Map<string, CredencialMarketplace>();

      for (const c of response.data as { marketplace: string; accessToken: string; refreshToken: string; sellerId: string }[]) {
        let { accessToken, refreshToken } = c;

        if (c.marketplace === 'mercadolivre' && refreshToken) {
          try {
            const renovado = await this.refreshMlToken(refreshToken);
            accessToken = renovado.accessToken;
            refreshToken = renovado.refreshToken;

            await axios.post(`${API_URL}/configuracoes`, {
              marketplace: c.marketplace,
              accessToken,
              refreshToken,
              sellerId: c.sellerId,
            }, { headers: { Authorization: `Bearer ${API_TOKEN}` } });

            console.log('[SyncJob] Token ML renovado com sucesso');
          } catch (err) {
            console.warn('[SyncJob] Falha ao renovar token ML — usando token atual');
          }
        }

        credenciais.set(c.marketplace, { tenantId: TENANT_ID, accessToken, refreshToken, sellerId: c.sellerId });
      }

      const pedidos = await this.aggregator.consolidarAsync(TENANT_ID, credenciais, {
        inicio: new Date(Date.now() - 86400000 * 30),
        fim: new Date(),
      });

      if (pedidos.length > 0) {
        await this.publisher.publicarAsync(pedidos[0]);
        await axios.post(`${API_URL}/pedidos/sync`, pedidos, {
          headers: { Authorization: `Bearer ${API_TOKEN}` },
        });
        console.log(`[SyncJob] ${pedidos.length} pedido(s) sincronizado(s) com a API`);
      } else {
        console.log(`[SyncJob] 0 pedido(s) encontrado(s)`);
      }
    } catch (err) {
      console.error('[SyncJob] Erro na varredura:', err);
    }
  }
}
