import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, errorToResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("limit") ?? 50), 100);

    const users = await prisma.user.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: { wallet: true, _count: { select: { orders: true } } },
    });

    return NextResponse.json({
      items: users.map((u) => ({
        ...u,
        wallet: u.wallet ? { ...u.wallet, balance: u.wallet.balance.toString() } : null,
      })),
    });
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
