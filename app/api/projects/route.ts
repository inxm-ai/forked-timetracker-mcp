import { NextRequest } from "next/server";
import { getUserIdOrThrow } from "@/lib/authUtils";
import { db } from "@/drizzle/connection";
import { projects, clients } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    await getUserIdOrThrow(req);
    
    const projectsList = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        hourlyRate: projects.hourlyRate,
        clientName: clients.name,
        active: projects.active,
      })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .orderBy(projects.name);

    return Response.json(projectsList);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}