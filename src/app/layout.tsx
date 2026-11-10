import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});
export const metadata: Metadata = {
  title: {
    default: "EduInsight AI · Аналитика образования",
    template: "%s · EduInsight AI",
  },
  description:
    "Образовательная аналитика: загрузка CSV, результаты по темам, распределение учебных часов и рекомендации.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body
        className={`${geist.variable} ${inter.variable} font-sans antialiased`}
      >
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
