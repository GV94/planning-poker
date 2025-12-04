FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install dependencies
COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile

# Build the p2p-manager backend
RUN pnpm nx run p2p-manager:build --configuration=production

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV="production"

# Copy node_modules and built artifacts from the builder image
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3002
ENV PORT=3002

CMD ["node", "dist/apps/p2p-manager/main.js"]


