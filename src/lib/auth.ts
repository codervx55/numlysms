import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}
export class ForbiddenError extends Error {
  constructor() {
    super("Not authorized");
    this.name = "ForbiddenError";
  }
}

/** Resolves the current Supabase session and ensures a matching User + Wallet row exists. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) throw new UnauthorizedError();

  // Upsert so the very first request after signup provisions the app-side User + Wallet.
  const user = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email: authUser.email ?? "",
      wallet: { create: { balance: 0n } },
    },
  });

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

/** Standard error → HTTP response mapping used by every route handler. */
export function errorToResponse(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return { status: 401, body: { error: "unauthorized" } };
  }
  if (err instanceof ForbiddenError) {
    return { status: 403, body: { error: "forbidden" } };
  }
  console.error(err);
  return { status: 500, body: { error: "internal_error" } };
}
