import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorToResponse, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    // Ownership check is not optional — an order id is a guessable UUID, not a secret.
    if (order.userId !== user.id && user.role !== "admin") {
      throw new ForbiddenError();
    }

    return NextResponse.json({ order: { ...order, price: order.price.toString() } });
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
