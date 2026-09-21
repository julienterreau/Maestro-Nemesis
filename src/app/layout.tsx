import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  title: "Nemesis AI",
  description:
    "Interface locale pour discuter avec les modèles cloud via OpenRouter.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#171717",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
        className={cn(
        "dark h-full overflow-hidden antialiased font-sans",
        geistSans.variable,
        geistMono.variable,
      )}
    >
      <body
        suppressHydrationWarning
        className="h-full overflow-hidden bg-background text-foreground"
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
