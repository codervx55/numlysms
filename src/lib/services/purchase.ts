import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  debitWalletForPurchase,
  refundOrder,
  DuplicateRequestError,
  InsufficientBalanceError,
} from "@/lib/services/wallet";
import { listServices, purchaseNumber, cancelNumber, XeroSmsError } from "@/lib/services/xerosms";

export class PurchaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "PurchaseError";
  }
}

type PurchaseInput = {
  userId: string;
  countryCode: string;
  countryName: string;
  serviceCode: string;
  serviceName: string;
  /** Client-generated, stable across retries of the *same* user click (e.g. a UUID
   *  stored in component state before the request fires, not regenerated on retry). */
  idempotencyKey: string;
};

/**
 * Orchestrates the full buy-number flow with compensating actions at every step,
 * so a failure partway through never leaves the user charged without a number, or
 * with a number Xero doesn't know about.
 *
 * Sequencing rationale:
 *  1. Order row created first (status=pending) — gives every later step a stable
 *     orderId to attach to, including the wallet debit itself.
 *  2. Price is re-fetched from XeroSMS server-side — the client only ever sends
 *     country+service codes, never a price, so a tampered request can't buy at a
 *     manipulated price.
 *  3. Wallet is debited before calling XeroSMS. This ordering is deliberate: if the
 *     debit fails (insufficient funds), we've made zero external API calls. If the
 *     debit succeeds but the XeroSMS call then fails, we refund — a single
 *     compensating action — rather than risk XeroSMS issuing a number we then fail
 *     to charge for.
 *  4. If XeroSMS succeeds but the final DB write (saving the number) fails, we
 *     retry that write a few times before falling back to cancelling the number at
 *     XeroSMS and refunding — because an unrecorded live number is worse than a
 *     failed purchase.
 */
export async function executePurchase(input: PurchaseInput) {
  const { userId, countryCode, countryName, serviceCode, serviceName, idempotencyKey } = input;

  // Idempotent replay: if this exact client action already produced an order, return it
  // instead of creating a second one (covers double-tap and client-side retry).
  const existingOrder = await prisma.order.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
  });
  if (existingOrder) return existingOrder;

  // Price comes from XeroSMS right now, server-side — never from the request body.
  const services = await listServices(countryCode);
  const service = services.find((s) => s.code === serviceCode);
  if (!service) {
    throw new PurchaseError("Service not available for this country", "service_unavailable");
  }
  const price = BigInt(service.priceMinor);

  const order = await prisma.order.create({
    data: {
      userId,
      status: OrderStatus.pending,
      country: countryName,
      countryCode,
      service: serviceName,
      serviceCode,
      price,
      idempotencyKey,
    },
  });

  try {
    await debitWalletForPurchase({
      userId,
      amount: price,
      idempotencyKey: `debit:${order.id}`,
      orderId: order.id,
    });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.failed, cancelledReason: "insufficient_balance" },
      });
      throw new PurchaseError("Insufficient wallet balance", "insufficient_balance");
    }
    if (err instanceof DuplicateRequestError) {
      // Debit already happened on a prior attempt for this order — safe to continue.
    } else {
      throw err;
    }
  }

  let purchaseResult;
  try {
    purchaseResult = await purchaseNumber(countryCode, serviceCode, `xero:${order.id}`);
  } catch (err) {
    // XeroSMS failed even after its internal retries — refund and mark failed.
    await refundOrder({
      userId,
      amount: price,
      orderId: order.id,
      reason: err instanceof XeroSmsError ? err.code : "xerosms_purchase_failed",
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.failed, cancelledReason: "xerosms_purchase_failed" },
    });
    throw new PurchaseError("Number purchase failed — you have been refunded", "purchase_failed");
  }

  // XeroSMS succeeded and a number now exists. Persist it, retrying the DB write
  // itself before falling back to unwinding the purchase — a live number that
  // isn't recorded anywhere is the worst outcome in this flow.
  const activated = await persistActivationWithRetry(order.id, purchaseResult);
  if (!activated) {
    await cancelNumber(purchaseResult.xeroOrderId).catch((e) =>
      console.error(`[purchase] CRITICAL: failed to cancel orphaned XeroSMS number`, e)
    );
    await refundOrder({ userId, amount: price, orderId: order.id, reason: "db_write_failed" });
    await prisma.order
      .update({
        where: { id: order.id },
        data: { status: OrderStatus.failed, cancelledReason: "db_write_failed" },
      })
      .catch((e) => console.error(`[purchase] CRITICAL: could not mark order failed`, e));
    throw new PurchaseError(
      "Purchase could not be completed — you have been refunded",
      "activation_persist_failed"
    );
  }

  return activated;
}

async function persistActivationWithRetry(
  orderId: string,
  result: { xeroOrderId: string; phoneNumber: string; expiresAt: string },
  attempts = 3
) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.active,
          xeroOrderId: result.xeroOrderId,
          phoneNumber: result.phoneNumber,
          expiresAt: new Date(result.expiresAt),
        },
      });
    } catch (err) {
      console.error(`[purchase] activation persist attempt ${i + 1} failed`, err);
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  return null;
}

/**
 * Called by the expiry sweep (cron) and manual cancellation. Refunds only apply
 * to orders that never delivered an SMS — completed orders are not refundable
 * through this path.
 */
export async function cancelAndRefundOrder(orderId: string, reason: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status !== OrderStatus.active && order.status !== OrderStatus.pending) {
    throw new PurchaseError("Order is not in a cancellable state", "not_cancellable");
  }

  if (order.xeroOrderId) {
    await cancelNumber(order.xeroOrderId).catch((e) =>
      console.error(`[purchase] failed to cancel number at XeroSMS for order ${orderId}`, e)
    );
  }

  await refundOrder({ userId: order.userId, amount: order.price, orderId: order.id, reason });

  return prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.cancelled, cancelledReason: reason },
  });
}
