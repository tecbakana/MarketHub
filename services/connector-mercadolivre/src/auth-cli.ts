import { MercadoLivreAuth } from './MercadoLivreAuth';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '../../.env' });

const CLIENT_ID = process.env.ML_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET ?? '';
const REDIRECT_URI = 'https://magical-greedy-designing.ngrok-free.dev/auth/callback';
const PORTA = 3000;

async function main(): Promise<void> {
  const auth = new MercadoLivreAuth({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
  });

  const url = auth.gerarUrlAutorizacao();
  console.log('\nAcesse esta URL no navegador para autorizar:\n');
  console.log(url);
  console.log('\nAguardando callback...\n');

  const code = await auth.aguardarCallback(PORTA);
  console.log('[Auth] Código recebido, trocando por tokens...');

  const tokens = await auth.trocarCodigoPorTokens(code);

  writeFileSync('../../.ml-tokens.json', JSON.stringify(tokens, null, 2));
  console.log('[Auth] Tokens salvos em .ml-tokens.json');
  console.log('userId:', tokens.userId);
}

main().catch(console.error);
