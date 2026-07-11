import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMinor, formatRelativeTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export default async function DashboardHomePage() {
  const user = await requireUser();

  const [wallet, recentOrders] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8 max-w-3xl">
      <section className="panel p-6 animate-fade-in-up">
        <p className="text-sm text-[var(--text-muted)]">Wallet balance</p>
        <p className="font-mono-board text-3xl text-[var(--mint)] mt-1">
          {formatMinor(wallet?.balance ?? 0n)}
        </p>
        <div className="flex gap-3 mt-4">
          <Link href="/dashboard/wallet">
            <Button variant="primary">Fund wallet</Button>
          </Link>
          <Link href="/dashboard/buy">
            <Button variant="secondary">Buy a number</Button>
          </Link>
        </div>
      </section>

      <section className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[var(--text-muted)]">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-sm text-[var(--amber)] hover:underline">
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm text-[var(--text-muted)]">
              No orders yet. Buy your first virtual number to get started.
            </p>
            <Link href="/dashboard/buy" className="inline-block mt-4">
              <Button variant="primary">Buy a number</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order, i) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="panel interactive-lift animate-fade-in-up flex items-center justify-between p-4 hover:border-[var(--amber)]/40 transition-colors"
                style={{ animationDelay: `${120 + i * 40}ms` }}
              >
                <div>
                  <p className="font-mono-board text-sm">{order.phoneNumber ?? "Provisioning…"}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {order.service} · {order.country} · {formatRelativeTime(order.createdAt)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
