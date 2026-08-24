import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="sticky top-0 z-50 glass border-x-0 border-t-0">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="font-display font-semibold text-xl tracking-tight bg-gradient-to-r from-accent to-[#A8E6F0] bg-clip-text text-transparent"
            >
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
