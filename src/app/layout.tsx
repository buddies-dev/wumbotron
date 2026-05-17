import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wumbotron",
  description: "Tournament display and control surfaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Link
          href="/"
          className="fixed left-3 top-3 z-50 rounded-md border border-white/15 bg-black/70 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 backdrop-blur transition hover:border-sky-300/70 hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          Wumbotron
        </Link>
        {children}
      </body>
    </html>
  );
}
