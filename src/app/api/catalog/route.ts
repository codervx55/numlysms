import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorToResponse } from "@/lib/auth";
import { listCountries, listServices } from "@/lib/services/xerosms";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const country = searchParams.get("country");

    if (country) {
      const services = await listServices(country);
      return NextResponse.json({ services });
    }

    const countries = await listCountries();
    return NextResponse.json({ countries });
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
