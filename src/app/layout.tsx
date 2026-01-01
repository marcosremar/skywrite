import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyWrite - Sua Tese nas Nuvens",
  description: "Escreva sua tese em Markdown com preview PDF em tempo real. Simples, poderoso, academico.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
