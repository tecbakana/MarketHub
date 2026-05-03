import { ItemPedido } from './ItemPedido.js';

export type StatusPedido = 'pendente' | 'pago' | 'enviado' | 'cancelado';
export type StatusNF = 'nao_emitida' | 'emitindo' | 'emitida' | 'erro';

export interface PedidoConsolidado {
  id: string;
  marketplace: string; // 'mercadolivre' | 'shopee' | 'magalu'
  tenantId: string;
  numeroPedido: string;
  dataPedido: Date;
  status: StatusPedido;
  statusNF: StatusNF;
  comprador: {
    nome: string;
    documento: string; // CPF ou CNPJ
    email: string;
    endereco: EnderecoEntrega;
  };
  itens: ItemPedido[];
  valorTotal: number;
  chaveNF?: string; // preenchida após emissão
}

export interface EnderecoEntrega {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}
