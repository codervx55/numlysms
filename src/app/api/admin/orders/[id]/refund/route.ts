import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, errorToResponse } from "@/lib/auth";
import { adminRefundSchema } from "@/lib/validations";
import { cancelAndRefundOrder, PurchaseError } from "@/lib/services/purchase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const json = await req.json();
    const parsed = adminRefundSchema.safeParse({ ...json, orderId: id });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const order = await cancelAndRefundOrder(id, `admin: ${parsed.data.reason}`);
    return NextResponse.json({ order: { ...order, price: order.price.toString() } });
  } catch (err) {
    if (err instanceof PurchaseError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 409 });
    }
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
