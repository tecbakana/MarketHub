import { config } from 'dotenv';
import { SpedyEmissor } from './SpedyEmissor';
import { PedidoConsolidado } from '@markethub/core';

config({ path: '../../.env' });

const pedidoMock: PedidoConsolidado = {
  id: '123456789',
  marketplace: 'mercadolivre',
  tenantId: 'tenant-1',
  numeroPedido: '123456789',
  dataPedido: new Date(),
  status: 'pago',
  statusNF: 'nao_emitida',
  comprador: {
    nome: 'João Silva',
    documento: '12345678901',
    email: 'test_user_comprador@testuser.com',
    endereco: {
      logradouro: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 10',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01001000',
    },
  },
  itens: [
    {
      sku: 'SKU-001',
      descricao: 'Produto Teste MarketHub',
      quantidade: 2,
      valorUnitario: 10.0,
      valorTotal: 20.0,
    },
  ],
  valorTotal: 20.0,
};

const emitter = new SpedyEmissor({
  apiKey: process.env.SPEDY_API_KEY ?? '',
  sandbox: process.env.SPEDY_SANDBOX === 'true',
});

emitter
  .emitirAsync(pedidoMock)
  .then((resultado) => {
    console.log(JSON.stringify(resultado, null, 2));
  })
  .catch(console.error);
