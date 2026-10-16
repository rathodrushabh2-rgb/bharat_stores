"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

type Tab = { href: string; label: string; icon: IconName; badge?: number };

/** Four tabs with the big "new bill" button in the middle. */
export function BottomNav({ left, right, newBillLabel }: { left: Tab[]; right: Tab[]; newBillLabel: string }) {
  const path = usePathname();
  const tab = (t: Tab) => {
    const active = t.href === "/" ? path === "/" : path.startsWith(t.href) && !path.startsWith("/bills/new");
    return (
      <Link key={t.href} href={t.href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[13px] ${active ? "font-semibold text-brand-600" : "text-muted"}`}>
        <Icon name={t.icon} size={24} />
        {t.label}
        {!!t.badge && (
          <span className="absolute right-[18%] top-0.5 min-w-5 rounded-full bg-red-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white">{t.badge}</span>
        )}
      </Link>
    );
  };
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-[#E4E6DE] bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-2xl grid-cols-5 items-center">
        {left.map(tab)}
        <Link
          href="/bills/new"
          aria-label={newBillLabel}
          className="-mt-8 flex h-16 w-16 items-center justify-center justify-self-center rounded-[22px] bg-brand-600 text-white shadow-[0_8px_20px_rgba(200,75,17,0.35)] active:scale-95"
        >
          <Icon name="plus" size={30} strokeWidth={2.6} />
        </Link>
        {right.map(tab)}
      </div>
    </nav>
  );
}
