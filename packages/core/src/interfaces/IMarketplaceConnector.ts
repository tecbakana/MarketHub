import { PedidoConsolidado } from '../dtos/PedidoConsolidado';

export interface DateRange {
  inicio: Date;
  fim: Date;
}

export interface CredencialMarketplace {
  tenantId: string;
  accessToken: string;
  refreshToken?: string;
  sellerId?: string;
}

export interface IMarketplaceConnector {
  readonly nome: string;
  consultarPedidosAsync(
    credencial: CredencialMarketplace,
    periodo: DateRange,
  ): Promise<PedidoConsolidado[]>;
}
