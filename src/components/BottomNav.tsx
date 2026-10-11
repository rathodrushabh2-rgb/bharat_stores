"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: string; badge?: number };

export function BottomNav({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className={`relative flex flex-1 flex-col items-center py-2 text-xs ${active ? "font-bold text-brand-600" : "text-stone-500"}`}>
              <span className="text-xl leading-6">{tab.icon}</span>
              {tab.label}
              {!!tab.badge && <span className="absolute right-[22%] top-1 min-w-5 rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{tab.badge}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
