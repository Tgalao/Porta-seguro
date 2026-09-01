import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Título e descrição que aparecem no separador do navegador.
export const metadata: Metadata = {
  title: "PortãoSeguro",
  description: "Sistema de registo de entradas e saídas escolares",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // lang="pt-PT" para o navegador e os leitores de ecrã saberem que o
    // conteúdo está em português de Portugal.
    <html
      lang="pt-PT"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
