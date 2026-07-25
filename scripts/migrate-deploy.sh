#!/bin/sh
# Roda as migrações pela conexão DIRETA quando disponível.
#
# Na Vercel, DATABASE_URL aponta para o pooler do Neon (pgbouncer em modo
# transação) — e o pg_advisory_lock do `prisma migrate deploy` não funciona
# através dele: lock e unlock podem cair em sessões diferentes do pool,
# deixando o lock preso e derrubando os deploys seguintes com P1002.
# DATABASE_URL_UNPOOLED (criada pela integração Neon) é a conexão direta,
# onde advisory locks se comportam corretamente.
#
# Sem a variável (dev local, Postgres do Docker sem pooler), segue com a
# DATABASE_URL normal vinda do .env.
set -e

if [ -n "$DATABASE_URL_UNPOOLED" ]; then
  export DATABASE_URL="$DATABASE_URL_UNPOOLED"
fi

exec prisma migrate deploy
