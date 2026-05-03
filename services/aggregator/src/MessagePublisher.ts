import amqplib from 'amqplib';
import { PedidoConsolidado } from '@markethub/core';

const QUEUE_NAME = 'markethub.pedidos';

export class MessagePublisher {
  private connection?: amqplib.ChannelModel;
  private channel?: amqplib.Channel;

  async conectarAsync(url: string): Promise<void> {
    this.connection = await amqplib.connect(url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue(QUEUE_NAME, { durable: true });
  }

  async publicarAsync(pedido: PedidoConsolidado): Promise<void> {
    if (!this.channel) throw new Error('Canal RabbitMQ não inicializado');
    const payload = Buffer.from(JSON.stringify(pedido));
    this.channel.sendToQueue(QUEUE_NAME, payload, { persistent: true });
  }

  async fecharAsync(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
