import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, errorToResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const status = searchParams.get("status") ?? undefined;

    const orders = await prisma.order.findMany({
      where: status ? { status: status as never } : undefined,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });

    return NextResponse.json({
      items: orders.map((o) => ({ ...o, price: o.price.toString() })),
    });
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
