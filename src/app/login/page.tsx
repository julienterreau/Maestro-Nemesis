import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { ensureAdmin } from "@/lib/ensure-admin";
import { getSession } from "@/lib/auth-user";

export default async function LoginPage() {
  await ensureAdmin();
  const session = await getSession();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
