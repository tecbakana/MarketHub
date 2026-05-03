import { MercadoLivreConnector } from './MercadoLivreConnector';

const connector = new MercadoLivreConnector();

const retornoMockML = {
  results: [
    {
      id: 123456789,
      status: 'paid',
      date_created: '2026-04-30T10:00:00.000-03:00',
      total_amount: 299.9,
      buyer: {
        id: 3370119314,
        nickname: 'TESTUSER123',
        email: 'test_user_comprador@testuser.com',
        first_name: 'João',
        last_name: 'Silva',
      },
      order_items: [
        {
          item: {
            id: 'MLB123456',
            title: 'Produto Teste MarketHub',
            seller_sku: 'SKU-001',
          },
          quantity: 2,
          unit_price: 149.95,
          full_unit_price: 149.95,
        },
      ],
      shipping: {
        receiver_address: {
          street_name: 'Rua das Flores',
          street_number: '123',
          comment: 'Apto 10',
          neighborhood: { name: 'Centro' },
          city: { name: 'São Paulo' },
          state: { name: 'SP' },
          zip_code: '01001000',
        },
      },
    },
  ],
};

// acessa o método privado via cast para teste
const pedidos = retornoMockML.results.map((raw) =>
  (connector as unknown as { mapearPedido: (raw: unknown) => unknown }).mapearPedido(raw),
);

console.log(JSON.stringify(pedidos, null, 2));
