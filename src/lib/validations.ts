import { z } from "zod";

const EMAIL_DOMAIN =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

export const adminEmailSchema = z
  .string({ error: "E-mail requis" })
  .trim()
  .min(1, "E-mail requis")
  .max(254, "E-mail trop long")
  .toLowerCase()
  .pipe(
    z.email({
      pattern: z.regexes.html5Email,
      error: "E-mail invalide",
    }),
  )
  .refine((email) => {
    const at = email.indexOf("@");
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const tld = domain.slice(domain.lastIndexOf(".") + 1);
    return (
      local.length > 0 &&
      local.length <= 64 &&
      !local.startsWith(".") &&
      !local.endsWith(".") &&
      !email.includes("..") &&
      EMAIL_DOMAIN.test(domain) &&
      tld.length >= 2 &&
      /^[a-z]+$/.test(tld)
    );
  }, "E-mail invalide");

export const adminPasswordSchema = z
  .string({ error: "Mot de passe requis" })
  .min(8, "8 caractères minimum")
  .max(128, "128 caractères maximum")
  .refine((value) => !/\s/.test(value), "Pas d’espace dans le mot de passe")
  .refine((value) => /[a-z]/.test(value), "Une minuscule est requise")
  .refine((value) => /[A-Z]/.test(value), "Une majuscule est requise")
  .refine((value) => /\d/.test(value), "Un chiffre est requis")
  .refine(
    (value) => /[^A-Za-z0-9]/.test(value),
    "Un caractère spécial est requis",
  );

export const ADMIN_PASSWORD_HINT =
  "8–128 caractères, minuscule, majuscule, chiffre et caractère spécial, sans espace.";

export const loginSchema = z
  .object({
    email: adminEmailSchema,
    password: adminPasswordSchema,
  })
  .refine((values) => values.password.toLowerCase() !== values.email, {
    message: "Le mot de passe ne peut pas être l’e-mail",
    path: ["password"],
  });

export const changeEmailSchema = z.object({
  newEmail: adminEmailSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: adminPasswordSchema,
    confirmPassword: adminPasswordSchema,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "Le nouveau mot de passe doit être différent",
    path: ["newPassword"],
  });

export const resetPasswordSchema = z
  .object({
    password: adminPasswordSchema,
    confirmPassword: adminPasswordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const speechSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Texte requis")
    .max(4000, "Texte trop long pour la voix (4000 caractères)."),
});

export const musicSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Décris le morceau")
    .max(2000, "Prompt trop long"),
  lyrics: z.string().trim().max(4000).optional(),
});

export const imageSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Décris l’image")
    .max(2000, "Prompt trop long"),
});

export function firstZodMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Données invalides";
}
