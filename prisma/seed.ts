import "dotenv/config";
import { auth } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import {
  adminEmailSchema,
  adminPasswordSchema,
  firstZodMessage,
} from "../src/lib/validations";

function parseAdminCredentials() {
  const email = adminEmailSchema.safeParse(process.env.ADMIN_EMAIL);
  const password = adminPasswordSchema.safeParse(process.env.ADMIN_PASSWORD);

  if (!email.success) {
    throw new Error(`ADMIN_EMAIL invalide : ${firstZodMessage(email.error)}`);
  }
  if (!password.success) {
    throw new Error(
      `ADMIN_PASSWORD invalide : ${firstZodMessage(password.error)}`,
    );
  }
  if (password.data.toLowerCase() === email.data) {
    throw new Error("ADMIN_PASSWORD ne peut pas être identique à ADMIN_EMAIL.");
  }

  return { email: email.data, password: password.data };
}

async function main() {
  const { email, password } = parseAdminCredentials();

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    if (existing.role !== "admin") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "admin" },
      });
    }
    console.log(`Admin déjà présent : ${email}`);
    return;
  }

  await auth.api.createUser({
    body: {
      email,
      password,
      name: "Admin",
      role: "admin",
    },
  });

  console.log(`Admin créé : ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
