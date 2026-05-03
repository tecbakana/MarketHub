import { describe, it, expect, vi } from 'vitest';
import { MarketplaceAggregator } from '../src/MarketplaceAggregator';
import {
  IMarketplaceConnector,
  PedidoConsolidado,
  CredencialMarketplace,
  DateRange,
} from '@markethub/core';

const pedidoMock: PedidoConsolidado = {
  id: '1',
  marketplace: 'mock',
  tenantId: 'tenant-1',
  numeroPedido: 'P001',
  dataPedido: new Date(),
  status: 'pago',
  statusNF: 'nao_emitida',
  comprador: {
    nome: 'João Silva',
    documento: '12345678901',
    email: 'joao@email.com',
    endereco: {
      logradouro: 'Rua Teste',
      numero: '1',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01001000',
    },
  },
  itens: [
    {
      sku: 'SKU-1',
      descricao: 'Produto Teste',
      quantidade: 1,
      valorUnitario: 100,
      valorTotal: 100,
    },
  ],
  valorTotal: 100,
};

const mockConnector: IMarketplaceConnector = {
  nome: 'mock',
  consultarPedidosAsync: vi.fn().mockResolvedValue([pedidoMock]),
};

const credenciais = new Map<string, CredencialMarketplace>([
  ['mock', { tenantId: 'tenant-1', accessToken: 'token-fake' }],
]);

const periodo: DateRange = { inicio: new Date(), fim: new Date() };

describe('MarketplaceAggregator', () => {
  it('consolida pedidos de um connector', async () => {
    const aggregator = new MarketplaceAggregator([mockConnector]);
    const resultado = await aggregator.consolidarAsync('tenant-1', credenciais, periodo);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].marketplace).toBe('mock');
  });

  it('ignora connector sem credencial', async () => {
    const aggregator = new MarketplaceAggregator([mockConnector]);
    const resultado = await aggregator.consolidarAsync('tenant-1', new Map(), periodo);
    expect(resultado).toHaveLength(0);
  });

  it('continua se um connector falhar', async () => {
    const connectorFalho: IMarketplaceConnector = {
      nome: 'falho',
      consultarPedidosAsync: vi.fn().mockRejectedValue(new Error('API fora do ar')),
    };
    const credenciaisComFalho = new Map<string, CredencialMarketplace>([
      ['mock', { tenantId: 'tenant-1', accessToken: 'token-fake' }],
      ['falho', { tenantId: 'tenant-1', accessToken: 'token-fake' }],
    ]);
    const aggregator = new MarketplaceAggregator([mockConnector, connectorFalho]);
    const resultado = await aggregator.consolidarAsync('tenant-1', credenciaisComFalho, periodo);
    expect(resultado).toHaveLength(1);
  });
});
