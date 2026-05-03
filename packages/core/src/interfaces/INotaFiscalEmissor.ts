import { PedidoConsolidado } from '../dtos/PedidoConsolidado';

export interface ResultadoEmissao {
  sucesso: boolean;
  chaveNF?: string;
  erro?: string;
}

export interface INotaFiscalEmissor {
  readonly nome: string;
  emitirAsync(pedido: PedidoConsolidado): Promise<ResultadoEmissao>;
}
