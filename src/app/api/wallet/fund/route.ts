import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorToResponse } from "@/lib/auth";
import { fundWalletSchema } from "@/lib/validations";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const parsed = fundWalletSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { amountMinor, idempotencyKey } = parsed.data;

    // We do NOT credit the wallet here. This only opens a Paystack transaction;
    // the wallet is credited exclusively by the verified webhook below, so a
    // client that claims success without actually paying can never inflate a
    // balance.
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountMinor, // Paystack expects kobo for NGN
        reference: idempotencyKey,
        metadata: { userId: user.id, idempotencyKey },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[wallet/fund] Paystack init failed: ${body}`);
      return NextResponse.json({ error: "payment_init_failed" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ authorizationUrl: data.data.authorization_url });
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
