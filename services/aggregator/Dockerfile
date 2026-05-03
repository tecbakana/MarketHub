# Contexto de build: raiz do monorepo (markethub/)
FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

# Arquivos de workspace e lock
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Pacotes e serviços necessários
COPY packages/core/ ./packages/core/
COPY services/connector-mercadolivre/ ./services/connector-mercadolivre/
COPY services/emitter-spedy/ ./services/emitter-spedy/
COPY services/aggregator/ ./services/aggregator/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @markethub/core build
RUN pnpm --filter @markethub/connector-mercadolivre build
RUN pnpm --filter @markethub/emitter-spedy build

WORKDIR /app/services/aggregator

CMD ["npx", "tsx", "src/index.ts"]
