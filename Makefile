.PHONY: dev build install up down db-migrate db-seed db-studio start

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

db-studio:
	pnpm prisma studio
