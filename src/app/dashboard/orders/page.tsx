"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMinor, formatRelativeTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonRow } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Order = {
  id: string;
  status: string;
  country: string;
  service: string;
  price: string;
  phoneNumber: string | null;
  createdAt: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(cursor?: string) {
    const url = cursor ? `/api/orders?cursor=${cursor}` : "/api/orders";
    const res = await fetch(url);
    const data = await res.json();
    setOrders((prev) => (cursor ? [...(prev ?? []), ...data.items] : data.items));
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-medium">Orders</h1>

      {orders === null ? (
        <div className="space-y-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : orders.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm text-[var(--text-muted)]">No orders yet.</p>
          <Link href="/dashboard/buy" className="inline-block mt-4">
            <Button variant="primary">Buy a number</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="panel flex items-center justify-between p-4 hover:border-[var(--amber)]/40 transition-colors"
              >
                <div>
                  <p className="font-mono-board text-sm">{order.phoneNumber ?? "Provisioning…"}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {order.service} · {order.country} · {formatMinor(order.price)} ·{" "}
                    {formatRelativeTime(order.createdAt)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </Link>
            ))}
          </div>
          {nextCursor && (
            <Button
              variant="secondary"
              className="w-full"
              loading={loadingMore}
              onClick={() => {
                setLoadingMore(true);
                load(nextCursor);
              }}
            >
              Load more
            </Button>
          )}
        </>
      )}
    </div>
  );
}
