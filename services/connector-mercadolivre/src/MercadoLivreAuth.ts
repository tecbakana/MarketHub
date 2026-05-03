import axios from 'axios';
import http from 'http';
import { URL } from 'url';

const AUTH_URL = 'https://auth.mercadolivre.com.br/authorization';
const TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';

interface MLTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

interface MLAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class MercadoLivreAuth {
  constructor(private readonly config: MLAuthConfig) {}

  gerarUrlAutorizacao(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async trocarCodigoPorTokens(code: string): Promise<MLTokens> {
    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      userId: String(response.data.user_id),
    };
  }

  async renovarTokens(refreshToken: string): Promise<MLTokens> {
    const response = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      userId: String(response.data.user_id),
    };
  }

  aguardarCallback(porta: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://localhost:${porta}`);
        const code = url.searchParams.get('code');

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h2>Autorizado! Pode fechar esta janela.</h2>');
          server.close();
          resolve(code);
        } else {
          res.writeHead(400);
          res.end('Código não encontrado');
          reject(new Error('code ausente no callback'));
        }
      });

      server.listen(porta, () => {
        console.log(`[Auth] Aguardando callback na porta ${porta}...`);
      });
    });
  }
}
