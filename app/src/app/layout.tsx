import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MINESWEEPER XTREME",
  description: "Le demineur classique, reinvente comme un champ de guerre solo a haute tension.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#0a0a0a] text-[#e8e8e8] antialiased">
        {children}
      </body>
    </html>
  );
}
