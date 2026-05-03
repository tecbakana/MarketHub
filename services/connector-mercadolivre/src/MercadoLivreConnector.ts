import axios from 'axios';
import {
  IMarketplaceConnector,
  CredencialMarketplace,
  DateRange,
  PedidoConsolidado,
  StatusPedido,
} from '@markethub/core';

const BASE_URL = 'https://api.mercadolibre.com';

export class MercadoLivreConnector implements IMarketplaceConnector {
  readonly nome = 'mercadolivre';

  async consultarPedidosAsync(
    credencial: CredencialMarketplace,
    periodo: DateRange,
  ): Promise<PedidoConsolidado[]> {
    const response = await axios.get(`${BASE_URL}/orders/search`, {
      headers: { Authorization: `Bearer ${credencial.accessToken}` },
      params: {
        seller: credencial.sellerId,
        'order.date_created.from': periodo.inicio.toISOString(),
        'order.date_created.to': periodo.fim.toISOString(),
      },
    });

    return (response.data.results as Record<string, unknown>[]).map((raw) =>
      this.mapearPedido(raw),
    );
  }

  private mapearPedido(raw: Record<string, unknown>): PedidoConsolidado {
    const buyer = raw.buyer as Record<string, unknown>;
    const shipping = raw.shipping as Record<string, unknown>;
    const endereco = (shipping?.receiver_address ?? {}) as Record<string, unknown>;
    const cidade = (endereco.city ?? {}) as Record<string, string>;
    const estado = (endereco.state ?? {}) as Record<string, string>;
    const bairro = (endereco.neighborhood ?? {}) as Record<string, string>;

    const itens = (raw.order_items as Record<string, unknown>[]).map((i) => {
      const item = i.item as Record<string, unknown>;
      return {
        sku: String(item.seller_sku ?? item.id),
        descricao: String(item.title),
        quantidade: Number(i.quantity),
        valorUnitario: Number(i.unit_price),
        valorTotal: Number(i.quantity) * Number(i.unit_price),
      };
    });

    return {
      id: String(raw.id),
      marketplace: 'mercadolivre',
      tenantId: '',
      numeroPedido: String(raw.id),
      dataPedido: new Date(String(raw.date_created)),
      status: this.mapearStatus(String(raw.status)),
      statusNF: 'nao_emitida',
      comprador: {
        nome: `${buyer.first_name} ${buyer.last_name}`,
        documento: '',
        email: String(buyer.email),
        endereco: {
          logradouro: String(endereco.street_name ?? ''),
          numero: String(endereco.street_number ?? 'S/N'),
          complemento: String(endereco.comment ?? ''),
          bairro: String(bairro.name ?? ''),
          cidade: String(cidade.name ?? ''),
          uf: String(estado.name ?? ''),
          cep: String(endereco.zip_code ?? ''),
        },
      },
      itens,
      valorTotal: Number(raw.total_amount),
    };
  }

  private mapearStatus(status: string): StatusPedido {
    const mapa: Record<string, StatusPedido> = {
      paid: 'pago',
      shipped: 'enviado',
      cancelled: 'cancelado',
    };
    return mapa[status] ?? 'pendente';
  }
}
