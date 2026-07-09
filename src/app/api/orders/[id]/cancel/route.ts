import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorToResponse, ForbiddenError } from "@/lib/auth";
import { cancelOrderSchema } from "@/lib/validations";
import { cancelAndRefundOrder, PurchaseError } from "@/lib/services/purchase";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (order.userId !== user.id && user.role !== "admin") throw new ForbiddenError();

    const json = await req.json().catch(() => ({}));
    const { reason } = cancelOrderSchema.parse(json);

    const updated = await cancelAndRefundOrder(id, reason);
    return NextResponse.json({ order: { ...updated, price: updated.price.toString() } });
  } catch (err) {
    if (err instanceof PurchaseError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 409 });
    }
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
