-- Múltiplos grupos.
--
-- Até aqui o sistema atendia um único clube (o GRASP): eventos e templates não
-- tinham dono. Esta migração cria a entidade Grupo, move todo o acervo
-- existente para um grupo inicial "GRASP" e torna `events.group_id`
-- obrigatório. As três etapas de backfill (INSERT do grupo, UPDATE das linhas,
-- SET NOT NULL) precisam rodar nesta ordem — inverter derruba a migração em
-- qualquer banco com dados.

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "callsign" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grupo inicial. O id é fixo para que as etapas de backfill abaixo possam
-- referenciá-lo; `prisma/seed.ts` faz upsert pelo mesmo nome, então instalar do
-- zero (migrar + semear) não cria um segundo "GRASP".
INSERT INTO "groups" ("id", "name", "description", "created_at", "updated_at")
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'GRASP',
    'Grupo inicial, criado na migração para múltiplos grupos.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- AlterTable: nasce anulável para permitir o backfill.
ALTER TABLE "events" ADD COLUMN "group_id" TEXT;

UPDATE "events" SET "group_id" = '00000000-0000-4000-8000-000000000001';

ALTER TABLE "events" ALTER COLUMN "group_id" SET NOT NULL;

-- AlterTable: em templates, NULL significa "template global da plataforma".
-- O "Padrão" é o fallback de todo evento sem template próprio e por isso
-- continua global; os demais passam a pertencer ao GRASP.
ALTER TABLE "templates" ADD COLUMN "group_id" TEXT;

UPDATE "templates" SET "group_id" = '00000000-0000-4000-8000-000000000001'
WHERE "name" <> 'Padrão';

-- Quadro de sócios inicial: todo usuário existente entra no GRASP, e quem já
-- administrava a plataforma (OWNER/ADMIN) vira admin do grupo.
INSERT INTO "group_members" ("id", "group_id", "user_id", "role", "created_at")
SELECT
    gen_random_uuid()::text,
    '00000000-0000-4000-8000-000000000001',
    u."id",
    CASE
        WHEN u."role" IN ('OWNER', 'ADMIN') THEN 'ADMIN'::"GroupRole"
        ELSE 'MEMBER'::"GroupRole"
    END,
    CURRENT_TIMESTAMP
FROM "users" u;

-- CreateIndex
CREATE INDEX "events_group_id_idx" ON "events"("group_id");

-- CreateIndex
CREATE INDEX "templates_group_id_idx" ON "templates"("group_id");

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
