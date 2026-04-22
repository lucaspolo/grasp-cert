import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hashSync } from "bcryptjs";

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
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log(`Seed: admin user created → ${admin.callsign} (${admin.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
