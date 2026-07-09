import { z } from "zod";

export const fundWalletSchema = z.object({
  amountMinor: z.number().int().positive().max(500_000_00), // cap: ₦500,000 per deposit
  idempotencyKey: z.string().min(8).max(128),
});

export const purchaseOrderSchema = z.object({
  countryCode: z.string().min(2).max(8),
  countryName: z.string().min(1).max(64),
  serviceCode: z.string().min(1).max(64),
  serviceName: z.string().min(1).max(64),
  idempotencyKey: z.string().min(8).max(128),
  // Deliberately no `price` field — price is always re-fetched server-side from
  // XeroSMS so a modified client request can never buy at a different price.
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(1).max(200).default("user_requested"),
});

export const adminRefundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(1).max(200),
});

export const paystackWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    reference: z.string(),
    amount: z.number().int().positive(), // kobo
    status: z.string(),
    metadata: z
      .object({
        userId: z.string().optional(),
        idempotencyKey: z.string().optional(),
      })
      .optional(),
  }),
});
