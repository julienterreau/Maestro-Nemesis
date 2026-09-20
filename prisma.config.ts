import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const datasourceUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  "postgresql://127.0.0.1:5432/placeholder";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
});
