"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Search",
    match: (path: string) => path === "/",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm10.5 2-5.4-5.4"
      />
    ),
  },
  {
    href: "/watchlist",
    label: "Watchlist",
    match: (path: string) => path.startsWith("/watchlist"),
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3.75h10.5a.75.75 0 0 1 .75.75v15.75l-6-3.75-6 3.75V4.5a.75.75 0 0 1 .75-.75Z"
      />
    ),
  },
  {
    href: "/discovery",
    label: "Discovery",
    match: (path: string) => path.startsWith("/discovery"),
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m15 9-2.25 5.25L9 16.5l2.25-5.25L15 9Z"
        />
      </>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 glass border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around h-16">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? "text-accent" : "text-text-dim"
              }`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
              >
                {tab.icon}
              </svg>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
