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
    <nav
      className="sm:hidden fixed z-50 left-3 right-3 glass rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-stretch justify-around h-16 px-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                active ? "text-accent" : "text-text-dim"
              }`}
            >
              <span
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                  active ? "bg-accent/15" : ""
                }`}
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                >
                  {tab.icon}
                </svg>
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
