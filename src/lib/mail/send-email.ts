import { pretty, render } from "@react-email/render";
import type { ReactElement } from "react";
import { env } from "@/lib/env";
import { resend } from "@/lib/mail/resend";

type SendEmailParams = {
  to: string;
  subject: string;
  react: ReactElement;
};

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  const html = await pretty(await render(react));
  const finalSubject =
    env.NODE_ENV === "development" ? `[DEV] ${subject}` : subject;

  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: finalSubject,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}
