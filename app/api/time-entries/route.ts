import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUtils";
import { db } from "@/drizzle/connection";
import { timeEntries, projects, clients } from "@/drizzle/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { createAuthorizationContext, canViewAllTimesheets, canViewUserTimesheets } from "@/lib/authorization";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url!);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const offset = (page - 1) * limit;
    
    // Filter parameters
    const search = searchParams.get("search") || "";
    const projectFilter = searchParams.get("projects"); // Can be "all" or comma-separated project names
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const userFilter = searchParams.get("users"); // Can be "all" or comma-separated user IDs

    // Build WHERE conditions
    const conditions = [];
    
    // User filter logic with authorization
    if (userFilter === "all") {
      // Check if user has permission to view all timesheets
      const authContext = createAuthorizationContext(user.userId, user.role);
      const authResult = canViewAllTimesheets(authContext);
      
      if (!authResult.authorized) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', reason: authResult.reason }), 
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Don't add user filter - show all users
    } else if (userFilter) {
      // Filter by specific user IDs using OR logic
      const userIds = userFilter.split(',').map(id => id.trim()).filter(Boolean);
      
      // Check authorization for each requested user
      if (userIds.some(id => id !== user.userId)) {
        const authContext = createAuthorizationContext(user.userId, user.role);
        
        // Check if user can view all timesheets (HR/Admin)
        const canViewAll = canViewAllTimesheets(authContext);
        
        if (!canViewAll.authorized) {
          // Check each user individually (for Manager role)
          for (const targetId of userIds) {
            if (targetId === user.userId) continue; // Can always view own data
            
            const authResult = canViewUserTimesheets(authContext, targetId);
            if (!authResult.authorized) {
              return new Response(
                JSON.stringify({ error: 'Forbidden', reason: authResult.reason }), 
                { status: 403, headers: { 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      }
      
      if (userIds.length === 1) {
        conditions.push(eq(timeEntries.userId, userIds[0]));
      } else if (userIds.length > 1) {
        // Use inArray for proper OR filtering
        conditions.push(inArray(timeEntries.userId, userIds));
      }
    } else {
      // Default: show only current user's entries
      conditions.push(eq(timeEntries.userId, user.userId));
    }
    
    // Search filter
    if (search) {
      conditions.push(
        sql`(
          LOWER(${timeEntries.description}) LIKE LOWER('%' || ${search} || '%') OR
          LOWER(${projects.name}) LIKE LOWER('%' || ${search} || '%') OR
          LOWER(${clients.name}) LIKE LOWER('%' || ${search} || '%')
        )`
      );
    }
    
    // Project filter logic
    if (projectFilter === "all") {
      // If "all" is specified, don't filter by project
    } else if (projectFilter) {
      // Filter by specific project names using OR logic
      const projectNames = projectFilter.split(',').map(name => name.trim()).filter(Boolean);
      if (projectNames.length === 1) {
        conditions.push(eq(projects.name, projectNames[0]));
      } else if (projectNames.length > 1) {
        // Use inArray for proper OR filtering
        conditions.push(inArray(projects.name, projectNames));
      }
    }
    
    // Date range filter
    if (dateFrom && dateTo) {
      conditions.push(
        sql`DATE(${timeEntries.startTime}) >= DATE(${dateFrom}) AND DATE(${timeEntries.startTime}) <= DATE(${dateTo})`
      );
    }

    // Build ORDER BY clause
    let orderByClause;
    const isAsc = sortOrder === 'asc';
    
    switch (sortBy) {
      case 'duration':
        orderByClause = isAsc ? timeEntries.durationMinutes : desc(timeEntries.durationMinutes);
        break;
      case 'project':
        orderByClause = isAsc ? projects.name : desc(projects.name);
        break;
      case 'date':
      default:
        orderByClause = isAsc ? timeEntries.startTime : desc(timeEntries.startTime);
        break;
    }

    const entries = await db
      .select({
        id: timeEntries.id,
        projectId: timeEntries.projectId,
        userId: timeEntries.userId,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        durationMinutes: timeEntries.durationMinutes,
        description: timeEntries.description,
        projectName: projects.name,
        clientName: clients.name,
        isActive: timeEntries.isActive,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(projects.id, timeEntries.projectId))
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Total count for pagination with same filters
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(timeEntries)
      .innerJoin(projects, eq(projects.id, timeEntries.projectId))
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(and(...conditions));

    return Response.json({ entries, page, limit, total: count });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { projectId, description = "" } = body;

    if (!projectId) {
      return new Response("Project ID is required", { status: 400 });
    }

    // Check if user already has an active timer
    const [existingActive] = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, user.userId),
          eq(timeEntries.isActive, true)
        )
      )
      .limit(1);

    if (existingActive) {
      return new Response("An active timer is already running", { status: 400 });
    }

    // Verify project exists (don't check ownership - any user can track time on any project)
    const [project] = await db
      .select()
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    // Generate unique ID for time entry
    const timeEntryId = `te_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new time entry
    const [newEntry] = await db
      .insert(timeEntries)
      .values({
        id: timeEntryId,
        userId: user.userId,
        projectId,
        description,
        startTime: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return Response.json(newEntry, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
