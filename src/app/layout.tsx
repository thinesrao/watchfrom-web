import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import BottomNav from "@/components/bottom-nav";
import Logo from "@/components/logo";
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
        <div className="sticky top-0 z-50 px-3 pt-3 sm:px-6">
          <nav className="max-w-5xl mx-auto glass rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            <div className="px-4 h-14 flex items-center justify-between">
              <Link href="/" aria-label="watchfrom home" className="flex items-center">
                <Logo />
              </Link>
              <div className="hidden sm:flex items-center gap-4">
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
        </div>
        <main className="flex-1 max-w-5xl mx-auto px-4 py-6 pb-28 sm:pb-6 w-full">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
