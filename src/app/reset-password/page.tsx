import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
