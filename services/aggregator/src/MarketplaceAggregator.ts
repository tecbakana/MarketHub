import {
  IMarketplaceConnector,
  CredencialMarketplace,
  DateRange,
  PedidoConsolidado,
} from '@markethub/core';

export class MarketplaceAggregator {
  constructor(private readonly connectors: IMarketplaceConnector[]) {}

  async consolidarAsync(
    tenantId: string,
    credenciais: Map<string, CredencialMarketplace>,
    periodo: DateRange,
  ): Promise<PedidoConsolidado[]> {
    const tasks = this.connectors.map((connector) => {
      const credencial = credenciais.get(connector.nome);
      if (!credencial) return Promise.resolve([]);
      return connector.consultarPedidosAsync(credencial, periodo);
    });

    const resultados = await Promise.allSettled(tasks);

    return resultados
      .filter((r): r is PromiseFulfilledResult<PedidoConsolidado[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .map((p) => ({ ...p, tenantId }));
  }
}
