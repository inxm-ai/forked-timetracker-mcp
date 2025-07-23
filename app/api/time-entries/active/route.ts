import { NextRequest } from "next/server";
import { getUserIdOrThrow } from "@/lib/authUtils";
import { db } from "@/drizzle/connection";
import { timeEntries, projects } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdOrThrow(req);
    
    const [activeEntry] = await db
      .select({
        id: timeEntries.id,
        projectName: projects.name,
        description: timeEntries.description,
        startTime: timeEntries.startTime,
        isActive: timeEntries.isActive,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(projects.id, timeEntries.projectId))
      .where(
        and(
          eq(timeEntries.userId, userId),
          eq(timeEntries.isActive, true)
        )
      )
      .limit(1);

    if (!activeEntry) {
      return Response.json({ isActive: false });
    }

    return Response.json(activeEntry);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdOrThrow(req);
    const body = await req.json();
    const { action } = body;

    if (action !== 'stop' && action !== 'pause') {
      return new Response("Invalid action", { status: 400 });
    }

    // Find the active entry
    const [activeEntry] = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          eq(timeEntries.isActive, true)
        )
      )
      .limit(1);

    if (!activeEntry) {
      return new Response("No active timer found", { status: 404 });
    }

    if (action === 'stop') {
      // Stop the timer and calculate duration
      const endTime = new Date();
      const startTime = new Date(activeEntry.startTime);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      await db
        .update(timeEntries)
        .set({
          endTime: endTime,
          durationMinutes: durationMinutes,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, activeEntry.id));

      return Response.json({ success: true, action: 'stopped', durationMinutes });
    } else if (action === 'pause') {
      // For now, pause just stops the timer (can be enhanced later for resume functionality)
      const endTime = new Date();
      const startTime = new Date(activeEntry.startTime);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      
      await db
        .update(timeEntries)
        .set({
          endTime: endTime,
          durationMinutes: durationMinutes,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, activeEntry.id));

      return Response.json({ success: true, action: 'paused', durationMinutes });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}