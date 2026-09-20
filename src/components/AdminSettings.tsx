"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  ADMIN_PASSWORD_HINT,
  changeEmailSchema,
  changePasswordSchema,
} from "@/lib/validations";

export function AdminSettings({ email }: { email: string }) {
  const router = useRouter();
  const emailForm = useForm<z.infer<typeof changeEmailSchema>>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: email },
  });
  const passwordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onChangeEmail(values: z.infer<typeof changeEmailSchema>) {
    if (values.newEmail === email.trim().toLowerCase()) {
      toast.error("Le nouvel e-mail doit être différent.");
      return;
    }
    const result = await authClient.changeEmail({
      newEmail: values.newEmail,
      callbackURL: "/admin",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Impossible de changer l’e-mail");
      return;
    }
    toast.success("Un e-mail de confirmation a été envoyé.");
  }

  async function onChangePassword(values: z.infer<typeof changePasswordSchema>) {
    const result = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Impossible de changer le mot de passe");
      return;
    }
    toast.success("Mot de passe mis à jour.");
    passwordForm.reset();
  }

  async function onSendReset() {
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Impossible d’envoyer le reset");
      return;
    }
    toast.success("E-mail de réinitialisation envoyé.");
  }

  async function onSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Tableau de bord</p>
          <h1 className="text-2xl font-semibold">Admin</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Chat
          </Link>
          <Button variant="secondary" onClick={onSignOut}>
            Déconnexion
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Changer l’e-mail</CardTitle>
          <CardDescription>Un lien de confirmation partira via Resend.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...emailForm}>
            <form className="space-y-4" onSubmit={emailForm.handleSubmit(onChangeEmail)}>
              <FormField
                control={emailForm.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouvel e-mail</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={emailForm.formState.isSubmitting}>
                Enregistrer l’e-mail
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changer le mot de passe</CardTitle>
          <CardDescription>{ADMIN_PASSWORD_HINT}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form className="space-y-4" onSubmit={passwordForm.handleSubmit(onChangePassword)}>
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe actuel</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                Mettre à jour le mot de passe
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset password par e-mail</CardTitle>
          <CardDescription>
            Envoie un lien Resend à {email}. Ce flux n’existe pas sur la page de connexion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onSendReset}>
            Envoyer l’e-mail de reset
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
