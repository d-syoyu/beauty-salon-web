import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import "./globals.css";
import SessionProvider from "../components/providers/session-provider";
import { cn } from "@/lib/utils";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "LUMINA HAIR STUDIO | 表参道の美容室",
  description: "自然由来の成分と熟練の技術で、あなたの美しさを引き出す表参道の美容室。オーガニック製品を使用した髪に優しい施術をご提供します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={cn("scroll-smooth", cormorant.variable, "font-sans", geist.variable)}>
      <body className="flex flex-col min-h-screen">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
