import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashSync } from "bcryptjs";
import { DEFAULT_TEMPLATE_CONFIG } from "../src/lib/template-config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = hashSync("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { callsign: "PY2ADM" },
    update: {},
    create: {
      callsign: "PY2ADM",
      email: "admin@grasp-cert.local",
      name: "Administrador",
      city: "São Paulo",
      state: "SP",
      role: "OWNER",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  console.log(`Seed: admin user created → ${admin.callsign} (${admin.email})`);

  // Seed default template
  const existing = await prisma.template.findFirst({
    where: { name: "Padrão" },
  });

  if (!existing) {
    const template = await prisma.template.create({
      data: {
        name: "Padrão",
        config: DEFAULT_TEMPLATE_CONFIG,
      },
    });
    console.log(`Seed: default template created → ${template.name} (${template.id})`);
  } else {
    console.log(`Seed: default template already exists → ${existing.name} (${existing.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
