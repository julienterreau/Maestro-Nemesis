import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import EmailChangeConfirmation from "@/emails/EmailChangeConfirmation";
import PasswordChanged from "@/emails/PasswordChanged";
import ResetPassword from "@/emails/ResetPassword";
import type { z } from "zod";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/mail/send-email";
import { prisma } from "@/lib/prisma";
import {
  adminEmailSchema,
  adminPasswordSchema,
  firstZodMessage,
  loginSchema,
} from "@/lib/validations";

function parseOrThrow<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new APIError("BAD_REQUEST", {
      message: firstZodMessage(parsed.error),
    });
  }
  return parsed.data;
}

const appUrl = env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: appUrl,
  trustedOrigins: [appUrl],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    async sendResetPassword({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: "Réinitialiser votre mot de passe",
        react: ResetPassword({ url }),
      });
    },
    onPasswordReset: async ({ user }) => {
      await sendEmail({
        to: user.email,
        subject: "Votre mot de passe a été modifié",
        react: PasswordChanged(),
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({
        newEmail,
        url,
      }: {
        newEmail: string;
        url: string;
      }) => {
        await sendEmail({
          to: newEmail,
          subject: "Confirmer votre nouvel e-mail",
          react: EmailChangeConfirmation({ url }),
        });
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { role: true },
          });

          if (user?.role !== "admin") {
            throw new APIError("FORBIDDEN", {
              message: "Seul l’administrateur peut se connecter.",
            });
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const body = ctx.body as Record<string, unknown> | undefined;
      if (!body) return;

      if (ctx.path === "/sign-in/email") {
        const parsed = parseOrThrow(loginSchema, body);
        body.email = parsed.email;
        body.password = parsed.password;
        return;
      }

      if (ctx.path === "/change-email") {
        body.newEmail = parseOrThrow(adminEmailSchema, body.newEmail);
        return;
      }

      if (ctx.path === "/change-password") {
        body.newPassword = parseOrThrow(adminPasswordSchema, body.newPassword);
        return;
      }

      if (ctx.path === "/reset-password") {
        body.newPassword = parseOrThrow(adminPasswordSchema, body.newPassword);
      }
    }),
  },
  plugins: [admin(), nextCookies()],
});
