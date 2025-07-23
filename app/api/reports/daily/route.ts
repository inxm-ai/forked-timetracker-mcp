import { NextRequest } from "next/server";
import { getUserIdOrThrow } from "@/lib/authUtils";
import { getDailyHours } from "@/lib/services/reports";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdOrThrow(req);
    const url = new URL(req.url!);
    const days = Number(url.searchParams.get("days")) || 14;
    const data = await getDailyHours(userId, days);
    return Response.json(data);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
