import { PrismaClient } from "@prisma/client";

function tryLoadEnv(path) {
  if (typeof process.loadEnvFile !== "function") {
    return;
  }
  try {
    process.loadEnvFile(path);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }
}

if (typeof process.loadEnvFile === "function") {
  tryLoadEnv(".env");
  tryLoadEnv(".env.local");
}

const prisma = new PrismaClient();

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

async function main() {
  const adminEmailRaw = process.env.INITIAL_ADMIN_EMAIL;
  if (!adminEmailRaw) {
    console.error("INITIAL_ADMIN_EMAIL saknas. Satt den i .env eller i shell-miljovariabler.");
    process.exit(1);
  }

  const adminEmail = normalizeEmail(adminEmailRaw);
  await prisma.allowedEmail.upsert({
    where: { email: adminEmail },
    update: { active: true, notes: "Bootstrap admin" },
    create: { email: adminEmail, active: true, notes: "Bootstrap admin" },
  });

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "admin" },
    create: {
      email: adminEmail,
      role: "admin",
      name: "Admin",
    },
  });

  console.log(`Admin klar: ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
