import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorToResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const [wallet, transactions] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId: user.id } }),
      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take,
      }),
    ]);

    return NextResponse.json({
      balance: (wallet?.balance ?? 0n).toString(),
      currency: wallet?.currency ?? "NGN",
      transactions: transactions.map((t) => ({
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
