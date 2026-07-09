"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function AdminRefundButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleRefund() {
    if (loading) return;
    if (!confirm("Refund this order and cancel the number?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "admin_manual_refund" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Refund failed");
      show("Order refunded.", "success");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Refund failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="danger" loading={loading} onClick={handleRefund} className="text-xs px-2 py-1">
      Refund
    </Button>
  );
}
