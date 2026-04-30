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

  // Seed bands
  const bandsData = [
    { name: "2190m", label: "2190 m" },
    { name: "630m", label: "630 m" },
    { name: "560m", label: "560 m" },
    { name: "160m", label: "160 m" },
    { name: "80m", label: "80 m" },
    { name: "60m", label: "60 m" },
    { name: "40m", label: "40 m" },
    { name: "30m", label: "30 m" },
    { name: "20m", label: "20 m" },
    { name: "17m", label: "17 m" },
    { name: "15m", label: "15 m" },
    { name: "12m", label: "12 m" },
    { name: "10m", label: "10 m" },
    { name: "8m", label: "8 m" },
    { name: "6m", label: "6 m" },
    { name: "5m", label: "5 m" },
    { name: "4m", label: "4 m" },
    { name: "2m", label: "2 m" },
    { name: "1.25m", label: "1.25 m" },
    { name: "70cm", label: "70 cm" },
    { name: "33cm", label: "33 cm" },
    { name: "23cm", label: "23 cm" },
    { name: "13cm", label: "13 cm" },
    { name: "9cm", label: "9 cm" },
    { name: "6cm", label: "6 cm" },
    { name: "3cm", label: "3 cm" },
    { name: "1.25cm", label: "1.25 cm" },
    { name: "6mm", label: "6 mm" },
    { name: "4mm", label: "4 mm" },
    { name: "2.5mm", label: "2.5 mm" },
    { name: "2mm", label: "2 mm" },
    { name: "1mm", label: "1 mm" },
    { name: "submm", label: "sub mm" },
  ];

  for (let i = 0; i < bandsData.length; i++) {
    await prisma.band.upsert({
      where: { name: bandsData[i].name },
      update: { label: bandsData[i].label, sortOrder: i },
      create: { name: bandsData[i].name, label: bandsData[i].label, sortOrder: i },
    });
  }
  console.log(`Seed: ${bandsData.length} bands upserted`);

  // Seed modes
  const modesData = [
    { name: "AM", label: "AM" },
    { name: "ARDOP", label: "ARDOP" },
    { name: "ATV", label: "ATV" },
    { name: "CHIP", label: "CHIP" },
    { name: "CLO", label: "CLO" },
    { name: "CONTESTI", label: "CONTESTI" },
    { name: "CW", label: "CW" },
    { name: "DATA", label: "DATA" },
    { name: "DIGITALVOICE", label: "DIGITALVOICE" },
    { name: "DOMINO", label: "DOMINO" },
    { name: "DYNAMIC", label: "DYNAMIC" },
    { name: "FAX", label: "FAX" },
    { name: "FM", label: "FM" },
    { name: "FSK441", label: "FSK441" },
    { name: "FT8", label: "FT8" },
    { name: "HELL", label: "HELL" },
    { name: "ISCAT", label: "ISCAT" },
    { name: "JT4", label: "JT4" },
    { name: "JT44", label: "JT44" },
    { name: "JT65", label: "JT65" },
    { name: "JT6M", label: "JT6M" },
    { name: "JT9", label: "JT9" },
    { name: "MFSK", label: "MFSK" },
    { name: "MSK144", label: "MSK144" },
    { name: "MT63", label: "MT63" },
    { name: "OLIVIA", label: "OLIVIA" },
    { name: "OPERA", label: "OPERA" },
    { name: "PAC", label: "PAC" },
    { name: "PAX", label: "PAX" },
    { name: "PKT", label: "PKT" },
    { name: "PSK", label: "PSK" },
    { name: "PSK2K", label: "PSK2K" },
    { name: "Q15", label: "Q15" },
    { name: "QRA64", label: "QRA64" },
    { name: "ROS", label: "ROS" },
    { name: "RTTY", label: "RTTY" },
    { name: "RTTYM", label: "RTTYM" },
    { name: "SSB", label: "SSB" },
    { name: "SSTV", label: "SSTV" },
    { name: "T10", label: "T10" },
    { name: "THOR", label: "THOR" },
    { name: "THRB", label: "THRB" },
    { name: "TOR", label: "TOR" },
    { name: "V4", label: "V4" },
    { name: "VOI", label: "VOI" },
    { name: "WINMOR", label: "WINMOR" },
    { name: "WSPR", label: "WSPR" },
  ];

  for (let i = 0; i < modesData.length; i++) {
    await prisma.mode.upsert({
      where: { name: modesData[i].name },
      update: { label: modesData[i].label, sortOrder: i },
      create: { name: modesData[i].name, label: modesData[i].label, sortOrder: i },
    });
  }
  console.log(`Seed: ${modesData.length} modes upserted`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
