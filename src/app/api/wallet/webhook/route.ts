import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { creditWallet, DuplicateRequestError } from "@/lib/services/wallet";
import { paystackWebhookSchema } from "@/lib/validations";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

/**
 * This is the ONLY place a deposit is ever credited. The client-facing
 * /api/wallet/fund route just opens a Paystack transaction — it never touches
 * the wallet balance — so a compromised or malicious client can't fake a deposit.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const expectedSignature = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  if (!signature || signature !== expectedSignature) {
    console.warn("[wallet/webhook] signature mismatch — rejecting");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const parsed = paystackWebhookSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    console.warn("[wallet/webhook] payload failed validation", parsed.error.flatten());
    // Still 200 — Paystack retries on non-2xx, and a malformed payload will never
    // become valid on retry, so ack it to stop the retry storm and log for review.
    return NextResponse.json({ received: true });
  }

  const { event, data } = parsed.data;
  if (event !== "charge.success" || data.status !== "success") {
    return NextResponse.json({ received: true });
  }

  const userId = data.metadata?.userId;
  const idempotencyKey = data.metadata?.idempotencyKey ?? data.reference;
  if (!userId) {
    console.error(`[wallet/webhook] charge.success with no userId in metadata: ${data.reference}`);
    return NextResponse.json({ received: true });
  }

  try {
    await creditWallet({
      userId,
      amount: BigInt(data.amount),
      idempotencyKey,
      type: "deposit",
      paystackRef: data.reference,
    });
  } catch (err) {
    if (err instanceof DuplicateRequestError) {
      // Paystack redelivered a webhook we already processed — expected and safe.
      return NextResponse.json({ received: true });
    }
    console.error(`[wallet/webhook] failed to credit wallet for ${data.reference}`, err);
    // Return 500 so Paystack retries — this case (DB hiccup) is worth retrying.
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
