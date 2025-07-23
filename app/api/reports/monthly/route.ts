import { NextRequest } from "next/server";
import { getUserIdOrThrow } from "@/lib/authUtils";
import { getMonthlyBilledHours } from "@/lib/services/reports";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdOrThrow(req);
    const url = new URL(req.url!);
    const months = Number(url.searchParams.get("months")) || 6;
    const data = await getMonthlyBilledHours(userId, months);
    return Response.json(data);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
