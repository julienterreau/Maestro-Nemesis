import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Powerfull Rokia AI",
  description:
    "Interface locale pour discuter avec les modèles cloud via OpenRouter.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={cn(
        "dark h-full antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
