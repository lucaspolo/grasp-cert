// Seed de DEMONSTRAÇÃO — só para desenvolvimento local.
//
// Cria usuários de cada papel (com senha conhecida), um evento em andamento, um
// evento futuro e alguns QSOs, para que todas as telas tenham conteúdo em
// capturas de tela e testes manuais. É aditivo e idempotente: só faz `upsert`
// com IDs fixos, nunca apaga nada e nunca toca no OWNER `PY2ADM` nem no
// template "Padrão" criados por `prisma/seed.ts`.
//
// Depende de `prisma/seed.ts` ter rodado antes (bandas e modos).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashSync } from "bcryptjs";
import { DEFAULT_TEMPLATE_CONFIG } from "../src/lib/template-config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "demo1234";

const DEMO_USERS = [
  {
    callsign: "PY1DEM",
    email: "demo-admin@grasp-cert.local",
    name: "Ana Demonstração",
    city: "Rio de Janeiro",
    state: "RJ",
    role: "ADMIN" as const,
  },
  {
    callsign: "PY2DEM",
    email: "demo-operador@grasp-cert.local",
    name: "Bruno Demonstração",
    city: "Campinas",
    state: "SP",
    role: "OPERATOR" as const,
  },
  {
    callsign: "PY3DEM",
    email: "demo-participante@grasp-cert.local",
    name: "Carla Demonstração",
    city: "Curitiba",
    state: "PR",
    role: "USER" as const,
  },
];

const EVENT_ATUAL = "demo-evt-atual";
const EVENT_FUTURO = "demo-evt-futuro";

const EVENT_BANDS = ["40m", "20m", "10m", "2m"];
const EVENT_MODES = ["SSB", "CW", "FT8"];

const FREQUENCIES: Record<string, string> = {
  "40m": "7.085",
  "20m": "14.200",
  "10m": "28.450",
  "2m": "144.300",
};

type DemoQso = {
  callsign: string;
  offsetMin: number; // minutos a partir da base
  band: string;
  mode: string;
  rstSent: string;
  rstReceived: string;
};

const DEMO_QSOS: DemoQso[] = [
  { callsign: "PY3DEM", offsetMin: 0, band: "40m", mode: "SSB", rstSent: "59", rstReceived: "59" },
  { callsign: "PY1ABC", offsetMin: 15, band: "40m", mode: "SSB", rstSent: "59", rstReceived: "57" },
  { callsign: "PY4XYZ", offsetMin: 35, band: "40m", mode: "CW", rstSent: "599", rstReceived: "579" },
  { callsign: "PY3DEM", offsetMin: 60, band: "20m", mode: "CW", rstSent: "599", rstReceived: "599" },
  { callsign: "PY5QRS", offsetMin: 95, band: "20m", mode: "SSB", rstSent: "57", rstReceived: "59" },
  { callsign: "PY1ABC", offsetMin: 130, band: "20m", mode: "FT8", rstSent: "-08", rstReceived: "-12" },
  { callsign: "PY3DEM", offsetMin: 175, band: "20m", mode: "FT8", rstSent: "-03", rstReceived: "-05" },
  { callsign: "PY6TUV", offsetMin: 210, band: "10m", mode: "SSB", rstSent: "59", rstReceived: "55" },
  { callsign: "PY4XYZ", offsetMin: 250, band: "10m", mode: "SSB", rstSent: "58", rstReceived: "59" },
  { callsign: "PY3DEM", offsetMin: 300, band: "10m", mode: "SSB", rstSent: "59", rstReceived: "59" },
  { callsign: "PY5QRS", offsetMin: 340, band: "2m", mode: "SSB", rstSent: "59", rstReceived: "59" },
  { callsign: "PY1ABC", offsetMin: 380, band: "2m", mode: "SSB", rstSent: "55", rstReceived: "57" },
];

async function main() {
  // Trava: o script fabrica usuários com senha conhecida. Rodar isso contra o
  // banco de produção (Neon) abriria contas reais — só banco local.
  if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error(
      "seed-demo só roda contra banco local (DATABASE_URL precisa apontar para localhost)."
    );
  }

  const passwordHash = hashSync(DEMO_PASSWORD, 10);

  // 1. Usuários de demonstração — um por papel.
  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { callsign: u.callsign },
      update: {
        email: u.email,
        name: u.name,
        city: u.city,
        state: u.state,
        role: u.role,
        passwordHash,
        emailVerified: new Date(),
      },
      create: {
        callsign: u.callsign,
        email: u.email,
        name: u.name,
        city: u.city,
        state: u.state,
        role: u.role,
        passwordHash,
        emailVerified: new Date(),
      },
    });
    console.log(`Demo: usuário ${u.callsign} (${u.role})`);
  }

  // 2. Template extra, para a lista de templates ter mais de uma linha.
  //    Template.name não é @unique — a busca é por nome, como no seed base.
  const demoTemplate =
    (await prisma.template.findFirst({ where: { name: "Demo Azul" } })) ??
    (await prisma.template.create({
      data: { name: "Demo Azul", config: DEFAULT_TEMPLATE_CONFIG },
    }));
  console.log(`Demo: template ${demoTemplate.name}`);

  const padrao = await prisma.template.findFirst({ where: { name: "Padrão" } });

  // 3. Eventos. O "atual" precisa estar em andamento para aparecer em
  //    "Acontecendo agora" na home; o outro, no futuro, para "Em breve".
  const day = 24 * 60 * 60 * 1000;
  const now = new Date();
  const startAtual = new Date(now.getTime() - 10 * day);
  const endAtual = new Date(now.getTime() + 20 * day);

  await prisma.event.upsert({
    where: { id: EVENT_ATUAL },
    update: { startDate: startAtual, endDate: endAtual },
    create: {
      id: EVENT_ATUAL,
      name: "Concurso Demo GRASP 2026",
      startDate: startAtual,
      endDate: endAtual,
      templateId: padrao?.id ?? null,
      observations:
        "Evento de demonstração usado no tutorial. Vale um QSO por banda e modo com cada estação.",
    },
  });

  await prisma.event.upsert({
    where: { id: EVENT_FUTURO },
    update: {
      startDate: new Date(now.getTime() + 45 * day),
      endDate: new Date(now.getTime() + 47 * day),
    },
    create: {
      id: EVENT_FUTURO,
      name: "Copa Demo de Inverno",
      startDate: new Date(now.getTime() + 45 * day),
      endDate: new Date(now.getTime() + 47 * day),
      templateId: demoTemplate.id,
      observations: "Inscrições abertas. Somente SSB e CW.",
    },
  });
  console.log("Demo: eventos criados/atualizados");

  // 4. Bandas e modos habilitados no evento atual.
  for (const name of EVENT_BANDS) {
    const band = await prisma.band.findUnique({ where: { name } });
    if (!band) throw new Error(`Banda ${name} não existe — rode 'make db-seed' antes.`);
    await prisma.eventBand.upsert({
      where: { eventId_bandId: { eventId: EVENT_ATUAL, bandId: band.id } },
      update: {},
      create: { eventId: EVENT_ATUAL, bandId: band.id },
    });
  }

  for (const name of EVENT_MODES) {
    const mode = await prisma.mode.findUnique({ where: { name } });
    if (!mode) throw new Error(`Modo ${name} não existe — rode 'make db-seed' antes.`);
    await prisma.eventMode.upsert({
      where: { eventId_modeId: { eventId: EVENT_ATUAL, modeId: mode.id } },
      update: {},
      create: { eventId: EVENT_ATUAL, modeId: mode.id },
    });
  }
  console.log("Demo: bandas e modos vinculados ao evento");

  // 5. O operador designado ao evento — sem isso ele não enxerga nada em
  //    /admin/events.
  const operador = await prisma.user.findUnique({ where: { callsign: "PY2DEM" } });
  if (!operador) throw new Error("Usuário PY2DEM não encontrado.");
  await prisma.eventOperator.upsert({
    where: { eventId_userId: { eventId: EVENT_ATUAL, userId: operador.id } },
    update: {},
    create: { eventId: EVENT_ATUAL, userId: operador.id },
  });
  console.log("Demo: PY2DEM designado como operador do evento atual");

  // 6. QSOs. IDs fixos para que reexecutar atualize as mesmas linhas em vez de
  //    esbarrar no @@unique(eventId, indicativo, dateTime, banda, modo).
  const base = new Date(
    Date.UTC(
      startAtual.getUTCFullYear(),
      startAtual.getUTCMonth(),
      startAtual.getUTCDate(),
      12,
      0,
      0
    )
  );

  for (let i = 0; i < DEMO_QSOS.length; i++) {
    const q = DEMO_QSOS[i];
    const band = await prisma.band.findUnique({ where: { name: q.band } });
    const mode = await prisma.mode.findUnique({ where: { name: q.mode } });
    if (!band || !mode) {
      throw new Error(`Banda ${q.band} ou modo ${q.mode} não existe.`);
    }

    const id = `demo-qso-${String(i + 1).padStart(2, "0")}`;
    const data = {
      eventId: EVENT_ATUAL,
      participantCallsign: q.callsign,
      operatorCallsign: "PY2DEM",
      dateTime: new Date(base.getTime() + q.offsetMin * 60 * 1000),
      frequency: FREQUENCIES[q.band],
      bandId: band.id,
      modeId: mode.id,
      rstSent: q.rstSent,
      rstReceived: q.rstReceived,
    };

    await prisma.qSO.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
  console.log(`Demo: ${DEMO_QSOS.length} QSOs criados/atualizados`);

  console.log(
    `\nContas de demonstração (senha "${DEMO_PASSWORD}"):\n` +
      DEMO_USERS.map((u) => `  ${u.callsign.padEnd(8)} ${u.role}`).join("\n")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
