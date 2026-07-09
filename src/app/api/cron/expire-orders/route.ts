import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cancelAndRefundOrder } from "@/lib/services/purchase";

/**
 * Order expiry is also checked lazily when a user polls /api/orders/[id]/sms, but
 * that only fires if someone actually opens the order. This sweep catches orders
 * left active with no one watching, so users get refunded even if they close the
 * tab and never come back.
 *
 * Wire this to a scheduled job (Vercel Cron, GitHub Actions cron, etc.) hitting
 * this route every few minutes with the CRON_SECRET below.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const expiredOrders = await prisma.order.findMany({
    where: { status: OrderStatus.active, expiresAt: { lt: new Date() } },
    take: 200,
  });

  const results = await Promise.allSettled(
    expiredOrders.map((o) => cancelAndRefundOrder(o.id, "expired_no_sms"))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - succeeded;
  if (failed > 0) {
    console.error(`[cron/expire-orders] ${failed} order(s) failed to refund on sweep`);
  }

  return NextResponse.json({ processed: expiredOrders.length, succeeded, failed });
}
