import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMinor, formatRelativeTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { AdminRefundButton } from "@/components/dashboard/admin-refund-button";

export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");

  const [users, orders, transactions] = await Promise.all([
    prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { wallet: true, _count: { select: { orders: true } } },
    }),
    prisma.order.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
    prisma.transaction.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    }),
  ]);

  return (
    <div className="space-y-10 max-w-4xl">
      <h1 className="text-lg font-medium">Admin</h1>

      <section>
        <h2 className="text-sm font-medium text-[var(--text-muted)] mb-3">Users</h2>
        <div className="panel divide-y divide-[var(--border)]">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p>{u.email}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {u._count.orders} orders · joined {formatRelativeTime(u.createdAt)}
                </p>
              </div>
              <span className="font-mono-board text-[var(--mint)]">
                {formatMinor(u.wallet?.balance ?? 0n)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--text-muted)] mb-3">Orders</h2>
        <div className="panel divide-y divide-[var(--border)]">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-4 text-sm gap-4">
              <div className="min-w-0">
                <p className="font-mono-board truncate">{o.phoneNumber ?? o.id}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {o.user.email} · {o.service} · {formatMinor(o.price)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={o.status} />
                {(o.status === "active" || o.status === "pending") && (
                  <AdminRefundButton orderId={o.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--text-muted)] mb-3">Transactions</h2>
        <div className="panel divide-y divide-[var(--border)]">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="capitalize">{t.type.replace("_", " ")}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {t.user.email} · {formatRelativeTime(t.createdAt)}
                </p>
              </div>
              <span className="font-mono-board">{formatMinor(t.amount)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
