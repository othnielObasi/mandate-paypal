# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json ./
RUN bun install --production

COPY . .

# Runtime stage
FROM oven/bun:1-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/agent ./agent
COPY --from=builder /app/package.json ./

# Non-root user that ships with the oven/bun image
RUN chown -R bun:bun /app
USER bun

CMD ["bun", "run", "agent/index.ts"]
