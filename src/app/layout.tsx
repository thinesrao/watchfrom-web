import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WatchFrom",
  description: "Find where movies and TV shows are streaming worldwide",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="text-accent font-bold text-xl tracking-tight">
              WatchFrom
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/discovery"
                className="text-text-dim hover:text-text transition-colors text-sm font-medium"
              >
                Discovery
              </Link>
              <Link
                href="/watchlist"
                className="text-text-dim hover:text-text transition-colors text-sm font-medium"
              >
                Watchlist
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
