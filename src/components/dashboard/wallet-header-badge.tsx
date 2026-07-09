"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMinor } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export function WalletHeaderBadge() {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wallet?limit=1")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBalance(data.balance ?? "0");
      })
      .catch(() => {
        if (!cancelled) setBalance("0");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link href="/dashboard/wallet" className="split-flap px-3 py-1.5 flex items-center gap-2">
      <span className="text-xs text-[var(--text-muted)]">Balance</span>
      {balance === null ? (
        <Skeleton className="h-4 w-16" />
      ) : (
        <span className="font-mono-board text-sm text-[var(--mint)]">{formatMinor(balance)}</span>
      )}
    </Link>
  );
}
