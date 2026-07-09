import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, errorToResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const userId = searchParams.get("userId") ?? undefined;

    const transactions = await prisma.transaction.findMany({
      where: userId ? { userId } : undefined,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });

    return NextResponse.json({
      items: transactions.map((t) => ({
        ...t,
        amount: t.amount.toString(),
        balanceAfter: t.balanceAfter?.toString() ?? null,
      })),
    });
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
