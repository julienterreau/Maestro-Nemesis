import { config } from "dotenv";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

config({ path: path.join(process.cwd(), ".env") });
config({ path: path.join(process.cwd(), ".env.local"), override: true });

function pgConnectionString(url: string) {
  if (!url) return url;
  let next = url.replace(
    /([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/i,
    "$1verify-full",
  );
  if (!/[?&]sslmode=/i.test(next) && !/localhost|127\.0\.0\.1/.test(next)) {
    next += `${next.includes("?") ? "&" : "?"}sslmode=verify-full`;
  }
  return next;
}

const connectionString = pgConnectionString(
  process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    "",
);

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof prismaClientSingleton>;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
