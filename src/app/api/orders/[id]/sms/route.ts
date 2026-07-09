import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { requireUser, errorToResponse, ForbiddenError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMessages } from "@/lib/services/xerosms";
import { refundOrder } from "@/lib/services/wallet";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (order.userId !== user.id && user.role !== "admin") throw new ForbiddenError();

    // Expired, unused numbers are refunded automatically — the user paid for a
    // window in which to receive an SMS, not for a specific outcome.
    if (order.status === OrderStatus.active && order.expiresAt && order.expiresAt < new Date()) {
      await refundOrder({
        userId: order.userId,
        amount: order.price,
        orderId: order.id,
        reason: "expired_no_sms",
      });
      const expired = await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.expired, cancelledReason: "expired_no_sms" },
      });
      const messages = await prisma.smsMessage.findMany({ where: { orderId: id } });
      return NextResponse.json({ order: { ...expired, price: expired.price.toString() }, messages });
    }

    if (order.status !== OrderStatus.active || !order.xeroOrderId) {
      const messages = await prisma.smsMessage.findMany({ where: { orderId: id } });
      return NextResponse.json({ order: { ...order, price: order.price.toString() }, messages });
    }

    const remoteMessages = await getMessages(order.xeroOrderId);

    if (remoteMessages.length > 0) {
      // skipDuplicates relies on the unique constraint on xeroMsgId, so re-polling
      // never inserts the same message twice even under concurrent polls.
      await prisma.smsMessage.createMany({
        data: remoteMessages.map((m) => ({
          orderId: id,
          sender: m.sender,
          content: m.content,
          xeroMsgId: m.id,
          receivedAt: new Date(m.receivedAt),
        })),
        skipDuplicates: true,
      });

      await prisma.order.update({
        where: { id },
        data: { status: OrderStatus.completed },
      });
    }

    const [updatedOrder, messages] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id } }),
      prisma.smsMessage.findMany({ where: { orderId: id }, orderBy: { receivedAt: "asc" } }),
    ]);

    return NextResponse.json({
      order: { ...updatedOrder, price: updatedOrder.price.toString() },
      messages,
    });
  } catch (err) {
    // XeroSMS being temporarily unreachable shouldn't break the poll loop on the
    // client — surface it as a distinct, retryable error rather than a hard 500.
    if (err instanceof Error && err.name === "XeroSmsError") {
      return NextResponse.json({ error: "provider_unavailable" }, { status: 503 });
    }
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
