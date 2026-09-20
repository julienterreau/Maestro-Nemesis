import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

let pending: Promise<void> | null = null;
let done = false;

export async function ensureAdmin() {
  if (done) return;
  if (!pending) {
    pending = provisionAdmin().finally(() => {
      pending = null;
    });
  }
  await pending;
}

async function provisionAdmin() {
  const email = env.ADMIN_EMAIL;
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existing) {
    if (existing.role !== "admin") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "admin" },
      });
    }
    done = true;
    return;
  }

  await auth.api.createUser({
    body: {
      email,
      password: env.ADMIN_PASSWORD,
      name: "Admin",
      role: "admin",
    },
  });
  done = true;
}
