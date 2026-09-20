import "dotenv/config";
import { ensureAdmin } from "../src/lib/ensure-admin";
import { prisma } from "../src/lib/prisma";

async function main() {
  await ensureAdmin();
  console.log("Admin prêt.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
