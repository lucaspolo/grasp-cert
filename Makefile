.PHONY: dev build install up down db-migrate db-push db-seed db-seed-demo db-studio start test

test:
	pnpm test

start:
	docker compose up -d
	pnpm prisma db push
	pnpm dev || true
	docker compose down

dev:
	pnpm dev

build:
	pnpm build

install:
	pnpm install

up:
	docker compose up -d

down:
	docker compose down

db-migrate:
	pnpm prisma migrate dev

db-push:
	pnpm prisma db push

db-seed:
	pnpm prisma db seed

# Dados fictícios para desenvolvimento (usuários de cada papel, evento e QSOs).
db-seed-demo:
	pnpm tsx prisma/seed-demo.ts

db-studio:
	pnpm prisma studio
