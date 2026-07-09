import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient wallet balance");
    this.name = "InsufficientBalanceError";
  }
}

export class DuplicateRequestError extends Error {
  // Thrown when an idempotency key was already used — caller should treat this as
  // "already handled" and fetch the existing result, not as a hard failure.
  constructor(public existingTransactionId: string) {
    super("Request already processed");
    this.name = "DuplicateRequestError";
  }
}

type WalletMutationResult = {
  transactionId: string;
  balanceAfter: bigint;
};

/**
 * Every wallet-balance mutation goes through this module. Nothing else should
 * write to Wallet.balance or Transaction directly.
 *
 * Concurrency model: each mutation runs inside a single Postgres transaction that
 * takes a row lock on the wallet (`SELECT ... FOR UPDATE`) before reading the
 * balance, so two concurrent requests for the same user serialize instead of both
 * reading a stale balance and racing to write it (classic double-spend bug).
 *
 * Idempotency model: callers must pass a stable idempotencyKey (e.g. the Paystack
 * reference for deposits, or a client-generated UUID for purchases). We enforce a
 * unique constraint on (userId, idempotencyKey), so a retried request — a network
 * retry, a re-delivered webhook, a double-tapped button — is a no-op that returns
 * the original result instead of applying the change twice.
 */

async function lockWallet(tx: Prisma.TransactionClient, userId: string) {
  const rows = await tx.$queryRaw<{ id: string; balance: bigint }[]>`
    SELECT id, balance FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new Error(`No wallet found for user ${userId}`);
  }
  return rows[0];
}

async function findExistingTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  idempotencyKey: string
) {
  return tx.transaction.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
  });
}

/** Credits the wallet. Used for confirmed deposits (Paystack webhook) and refunds. */
export async function creditWallet(params: {
  userId: string;
  amount: bigint; // minor units, must be > 0
  idempotencyKey: string;
  type: Extract<TransactionType, "deposit" | "refund" | "admin_adjustment">;
  orderId?: string;
  paystackRef?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<WalletMutationResult> {
  const { userId, amount, idempotencyKey, type, orderId, paystackRef, metadata } = params;
  if (amount <= 0n) throw new Error("Credit amount must be positive");

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingTransaction(tx, userId, idempotencyKey);
    if (existing) throw new DuplicateRequestError(existing.id);

    const wallet = await lockWallet(tx, userId);
    const newBalance = wallet.balance + amount;

    await tx.wallet.update({
      where: { userId },
      data: { balance: newBalance, version: { increment: 1 } },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        type,
        status: TransactionStatus.completed,
        amount,
        balanceAfter: newBalance,
        idempotencyKey,
        orderId,
        paystackRef,
        metadata,
      },
    });

    return { transactionId: transaction.id, balanceAfter: newBalance };
  });
}

/**
 * Debits the wallet for a purchase. Throws InsufficientBalanceError inside the same
 * locked transaction that checks the balance, so there's no window between "check"
 * and "deduct" for a second request to slip through.
 */
export async function debitWalletForPurchase(params: {
  userId: string;
  amount: bigint;
  idempotencyKey: string;
  orderId: string;
}): Promise<WalletMutationResult> {
  const { userId, amount, idempotencyKey, orderId } = params;
  if (amount <= 0n) throw new Error("Debit amount must be positive");

  return prisma.$transaction(async (tx) => {
    const existing = await findExistingTransaction(tx, userId, idempotencyKey);
    if (existing) throw new DuplicateRequestError(existing.id);

    const wallet = await lockWallet(tx, userId);
    if (wallet.balance < amount) {
      throw new InsufficientBalanceError();
    }
    const newBalance = wallet.balance - amount;

    await tx.wallet.update({
      where: { userId },
      data: { balance: newBalance, version: { increment: 1 } },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: TransactionType.purchase,
        status: TransactionStatus.completed,
        amount,
        balanceAfter: newBalance,
        idempotencyKey,
        orderId,
      },
    });

    return { transactionId: transaction.id, balanceAfter: newBalance };
  });
}

/** Convenience wrapper: refund is just a credit, but named distinctly for call-site clarity. */
export async function refundOrder(params: {
  userId: string;
  amount: bigint;
  orderId: string;
  reason: string;
}): Promise<WalletMutationResult> {
  // Deterministic idempotency key: refunding the same order twice is always a no-op,
  // even if triggered from two different code paths (e.g. cron cleanup + manual admin action).
  const idempotencyKey = `refund:${params.orderId}`;
  return creditWallet({
    userId: params.userId,
    amount: params.amount,
    idempotencyKey,
    type: TransactionType.refund,
    orderId: params.orderId,
    metadata: { reason: params.reason },
  });
}

export async function getWalletBalance(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet?.balance ?? 0n;
}
