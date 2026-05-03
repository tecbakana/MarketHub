import axios from 'axios';
import { CredencialMarketplace } from '@markethub/core';
import { MarketplaceAggregator } from './MarketplaceAggregator';
import { MessagePublisher } from './MessagePublisher';

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

  private async listarTenantsAsync(apiUrl: string): Promise<string[]> {
    const secret = process.env.MARKETHUB_SECRET ?? '';
    const res = await axios.get(`${apiUrl}/admin/tenants-com-credenciais`, {
      headers: { 'x-admin-secret': secret },
    });
    return res.data as string[];
  }

  private async sincronizarTenantAsync(apiUrl: string, tenantId: string): Promise<void> {
    const API_TOKEN = await this.obterTokenAsync(apiUrl, tenantId);

    const response = await axios.get(`${apiUrl}/configuracoes`, {
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

          await axios.post(`${apiUrl}/configuracoes`, {
            marketplace: c.marketplace,
            accessToken,
            refreshToken,
            sellerId: c.sellerId,
          }, { headers: { Authorization: `Bearer ${API_TOKEN}` } });

          console.log(`[SyncJob] [${tenantId}] Token ML renovado`);
        } catch {
          console.warn(`[SyncJob] [${tenantId}] Falha ao renovar token ML — usando token atual`);
        }
      }

      credenciais.set(c.marketplace, { tenantId, accessToken, refreshToken, sellerId: c.sellerId });
    }

    const pedidos = await this.aggregator.consolidarAsync(tenantId, credenciais, {
      inicio: new Date(Date.now() - 86400000 * 30),
      fim: new Date(),
    });

    if (pedidos.length > 0) {
      await this.publisher.publicarAsync(pedidos[0]);
      await axios.post(`${apiUrl}/pedidos/sync`, pedidos, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      console.log(`[SyncJob] [${tenantId}] ${pedidos.length} pedido(s) sincronizado(s)`);
    } else {
      console.log(`[SyncJob] [${tenantId}] 0 pedido(s) encontrado(s)`);
    }
  }

  private async executarAsync(): Promise<void> {
    const API_URL = process.env.API_URL ?? 'http://localhost:4000';
    console.log(`[SyncJob] Iniciando varredura — ${new Date().toISOString()}`);

    try {
      const tenants = await this.listarTenantsAsync(API_URL);
      console.log(`[SyncJob] ${tenants.length} tenant(s) com credenciais`);

      for (const tenantId of tenants) {
        try {
          await this.sincronizarTenantAsync(API_URL, tenantId);
        } catch (err) {
          console.error(`[SyncJob] [${tenantId}] Erro na sincronização:`, err);
        }
      }
    } catch (err) {
      console.error('[SyncJob] Erro na varredura:', err);
    }
  }
}
