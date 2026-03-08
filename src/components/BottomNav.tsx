"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Recipes", href: "/recipes", icon: "🍽️" },
  { label: "Plan", href: "/plan", icon: "📅" },
  { label: "Shopping", href: "/shopping", icon: "🛒" },
  { label: "Prep", href: "/prep", icon: "🔪" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      {tabs.map(({ label, href, icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
              isActive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {icon}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
