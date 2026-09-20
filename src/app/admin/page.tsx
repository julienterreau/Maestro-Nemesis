import { redirect } from "next/navigation";
import { AdminSettings } from "@/components/AdminSettings";
import { getRequiredAdmin } from "@/lib/auth-user";

export default async function AdminPage() {
  const session = await getRequiredAdmin();
  if (!session) {
    redirect("/login");
  }

  return <AdminSettings email={session.user.email} />;
}
