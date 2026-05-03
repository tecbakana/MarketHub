import axios from 'axios';
import { INotaFiscalEmissor, PedidoConsolidado, ResultadoEmissao } from '@markethub/core';

const POLLING_INTERVAL_MS = 5000;
const POLLING_MAX_TENTATIVAS = 12; // ~60 segundos

interface SpedyConfig {
  apiKey: string;
  sandbox?: boolean;
}

export class SpedyEmissor implements INotaFiscalEmissor {
  readonly nome = 'spedy';

  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: SpedyConfig) {
    this.baseUrl = config.sandbox
      ? 'https://sandbox-api.spedy.com.br/v1'
      : 'https://api.spedy.com.br/v1';
    this.headers = { 'X-Api-Key': config.apiKey };
  }

  async emitirAsync(pedido: PedidoConsolidado): Promise<ResultadoEmissao> {
    try {
      const payload = this.mapearPedido(pedido);
      const response = await axios.post(`${this.baseUrl}/orders`, payload, {
        headers: this.headers,
      });

      const orderId: string = response.data.id;
      return await this.aguardarAutorizacao(orderId);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        return { sucesso: false, erro: JSON.stringify(err.response?.data) };
      }
      return { sucesso: false, erro: String(err) };
    }
  }

  private mapearPedido(pedido: PedidoConsolidado): unknown {
    return {
      transactionId: pedido.numeroPedido,
      integrationId: pedido.numeroPedido,
      date: pedido.dataPedido.toISOString(),
      amount: pedido.valorTotal,
      autoIssueMode: 'immediately',
      status: 'approved',
      sendEmailToCustomer: false,
      customer: {
        name: pedido.comprador.nome,
        federalTaxNumber: pedido.comprador.documento,
        email: pedido.comprador.email,
        address: {
          street: pedido.comprador.endereco.logradouro,
          number: pedido.comprador.endereco.numero,
          district: pedido.comprador.endereco.bairro,
          postalCode: pedido.comprador.endereco.cep,
          additionalInformation: pedido.comprador.endereco.complemento,
          city: {
            name: pedido.comprador.endereco.cidade,
            state: pedido.comprador.endereco.uf,
          },
        },
      },
      items: pedido.itens.map((item) => ({
        quantity: item.quantidade,
        price: item.valorUnitario,
        amount: item.valorTotal,
        discountAmount: 0,
        product: {
          name: item.descricao,
          code: item.sku,
          price: item.valorUnitario,
        },
      })),
    };
  }

  private async aguardarAutorizacao(orderId: string): Promise<ResultadoEmissao> {
    for (let i = 0; i < POLLING_MAX_TENTATIVAS; i++) {
      await this.sleep(POLLING_INTERVAL_MS);

      const response = await axios.get(`${this.baseUrl}/orders/${orderId}`, {
        headers: this.headers,
      });

      const invoices: Array<{ id: string; status: string }> = response.data.invoices ?? [];
      const nota = invoices[0];

      if (!nota) continue;

      if (nota.status === 'authorized') {
        return { sucesso: true, chaveNF: nota.id };
      }

      if (['rejected', 'canceled', 'denied'].includes(nota.status)) {
        const detalhe = await axios.get(`${this.baseUrl}/orders/${orderId}`, {
          headers: this.headers,
        });
        const invoices = detalhe.data.invoices ?? [];
        const notaDetalhe = invoices[0] as Record<string, unknown>;
        const processing = (notaDetalhe?.processingDetail as Record<string, string>) ?? {};
        return {
          sucesso: false,
          erro: `${processing.message ?? 'Rejeitada'} (código: ${processing.code ?? 'N/A'})`,
        };
      }
    }

    return { sucesso: false, erro: 'Timeout aguardando autorização da nota' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
