import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorToResponse } from "@/lib/auth";
import { purchaseOrderSchema } from "@/lib/validations";
import { executePurchase, PurchaseError } from "@/lib/services/purchase";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const take = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = orders.length > take;
    const items = hasMore ? orders.slice(0, take) : orders;

    return NextResponse.json({
      items: items.map(serializeOrder),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const json = await req.json();
    const parsed = purchaseOrderSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const order = await executePurchase({ userId: user.id, ...parsed.data });
    return NextResponse.json({ order: serializeOrder(order) }, { status: 201 });
  } catch (err) {
    if (err instanceof PurchaseError) {
      const status = err.code === "insufficient_balance" ? 402 : 422;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}

// BigInt fields don't serialize through JSON.stringify by default.
function serializeOrder(order: {
  id: string;
  status: string;
  country: string;
  service: string;
  price: bigint;
  currency: string;
  phoneNumber: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}) {
  return { ...order, price: order.price.toString() };
}
