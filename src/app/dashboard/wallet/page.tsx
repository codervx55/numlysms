"use client";

import { useEffect, useState } from "react";
import { formatMinor, formatRelativeTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { SkeletonRow } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type Transaction = {
  id: string;
  type: string;
  status: string;
  amount: string;
  createdAt: string;
};

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000]; // NGN

export default function WalletPage() {
  const { show } = useToast();
  const [balance, setBalance] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [amount, setAmount] = useState<number>(5000);
  const [funding, setFunding] = useState(false);

  async function loadWallet() {
    const res = await fetch("/api/wallet");
    const data = await res.json();
    setBalance(data.balance);
    setTransactions(data.transactions);
  }

  useEffect(() => {
    loadWallet();
  }, []);

  async function handleFund() {
    if (funding) return; // double-click protection
    setFunding(true);
    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMinor: Math.round(amount * 100),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start payment");
      window.location.href = data.authorizationUrl;
    } catch (err) {
      show(err instanceof Error ? err.message : "Something went wrong. Try again.", "error");
      setFunding(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="panel p-6">
        <p className="text-sm text-[var(--text-muted)]">Available balance</p>
        {balance === null ? (
          <div className="h-9 w-32 mt-2 animate-pulse bg-[var(--panel-raised)] rounded-md" />
        ) : (
          <p className="font-mono-board text-3xl text-[var(--mint)] mt-1">{formatMinor(balance)}</p>
        )}
      </section>

      <section className="panel p-6 space-y-4">
        <h2 className="text-sm font-medium">Fund wallet</h2>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => setAmount(amt)}
              className={`rounded-lg border px-2 py-2 text-sm font-mono-board transition-colors ${
                amount === amt
                  ? "border-[var(--amber)] text-[var(--amber)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]"
              }`}
            >
              ₦{amt.toLocaleString()}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="custom-amount" className="block text-sm text-[var(--text-muted)] mb-1.5">
            Or enter a custom amount (₦)
          </label>
          <input
            id="custom-amount"
            type="number"
            min={100}
            step={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-lg bg-[var(--panel-raised)] border border-[var(--border)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--amber)]/50 focus:border-[var(--amber)]"
          />
        </div>
        <Button onClick={handleFund} loading={funding} disabled={amount < 100} className="w-full">
          Continue to payment
        </Button>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--text-muted)] mb-3">Transaction history</h2>
        {transactions === null ? (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : transactions.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="text-2xl mb-2">🧾</p>
            <p className="text-sm text-[var(--text-muted)]">No transactions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="panel flex items-center justify-between p-4">
                <div>
                  <p className="text-sm capitalize">{t.type.replace("_", " ")}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {formatRelativeTime(t.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono-board text-sm ${
                      t.type === "deposit" || t.type === "refund"
                        ? "text-[var(--mint)]"
                        : "text-[var(--coral)]"
                    }`}
                  >
                    {t.type === "deposit" || t.type === "refund" ? "+" : "−"}
                    {formatMinor(t.amount)}
                  </p>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
