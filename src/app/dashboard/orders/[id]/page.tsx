"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { formatMinor, formatRelativeTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

type Order = {
  id: string;
  status: string;
  country: string;
  service: string;
  price: string;
  phoneNumber: string | null;
  createdAt: string;
  expiresAt: string | null;
};
type Message = { id: string; sender: string; content: string; receivedAt: string };

const ACTIVE_STATUSES = ["pending", "active"];
const POLL_INTERVAL_MS = 5000;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function poll() {
    try {
      const res = await fetch(`/api/orders/${id}/sms`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return; // transient failure (e.g. provider_unavailable) — next poll will retry
      const data = await res.json();
      setOrder(data.order);
      setMessages(data.messages);

      if (!ACTIVE_STATUSES.includes(data.order.status) && pollRef.current) {
        clearInterval(pollRef.current);
      }
    } catch {
      // Network hiccup — silently retry on the next interval rather than toasting
      // every blip during a live poll loop.
    }
  }

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "user_requested" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not cancel order");
      setOrder(data.order);
      show("Order cancelled and refunded.", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not cancel order.", "error");
    } finally {
      setCancelling(false);
    }
  }

  if (notFound) {
    return (
      <div className="panel p-8 text-center max-w-lg">
        <p className="text-2xl mb-2">🔍</p>
        <p className="text-sm text-[var(--text-muted)]">Order not found.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="panel p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono-board text-2xl">{order.phoneNumber ?? "Provisioning…"}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {order.service} · {order.country} · {formatMinor(order.price)}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Purchased {formatRelativeTime(order.createdAt)}
          {order.expiresAt && ` · Expires ${formatRelativeTime(order.expiresAt)}`}
        </p>
        {ACTIVE_STATUSES.includes(order.status) && (
          <Button variant="danger" className="mt-4" loading={cancelling} onClick={handleCancel}>
            Cancel &amp; refund
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-[var(--text-muted)] mb-3">SMS inbox</h2>
        {messages.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm text-[var(--text-muted)]">
              {ACTIVE_STATUSES.includes(order.status)
                ? "Waiting for a message to arrive…"
                : "No messages were received for this number."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="panel p-4 flap-flip">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium">{m.sender}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatRelativeTime(m.receivedAt)}
                  </span>
                </div>
                <p className="text-sm font-mono-board mt-1.5">{m.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
