"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "◆" },
  { href: "/dashboard/buy", label: "Buy", icon: "＋" },
  { href: "/dashboard/orders", label: "Orders", icon: "☰" },
  { href: "/dashboard/wallet", label: "Wallet", icon: "◐" },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex flex-col w-56 shrink-0 border-r border-[var(--border)] p-4 gap-1">
      <div className="px-2 mb-6">
        <Logo size="sm" />
      </div>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? "bg-[var(--panel-raised)] text-[var(--amber)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--panel)]"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 border-t border-[var(--border)] bg-[var(--board-bg)] flex z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs ${
              active ? "text-[var(--amber)]" : "text-[var(--text-muted)]"
            }`}
          >
            <span className="text-base" aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
