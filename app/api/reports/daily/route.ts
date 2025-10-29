import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUtils";
import { getDailyHours } from "@/lib/services/reports";
import { createAuthorizationContext, canViewUserTimesheets, canViewAllTimesheets } from "@/lib/authorization";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url!);
    const days = Number(url.searchParams.get("days")) || 14;
    
    // Check if specific user(s) requested
    const targetUserId = url.searchParams.get("userId");
    const targetUserIdsParam = url.searchParams.get("userIds"); // Comma-separated user IDs
    
    // Parse multiple user IDs if provided
    let targetUserIds: string[] | undefined;
    if (targetUserIdsParam) {
      targetUserIds = targetUserIdsParam.split(',').map(id => id.trim()).filter(Boolean);
    } else if (targetUserId) {
      targetUserIds = [targetUserId];
    }
    
    // If requesting other users' data, check authorization
    if (targetUserIds && targetUserIds.some(id => id !== user.userId)) {
      const authContext = createAuthorizationContext(user.userId, user.role);
      
      // Check if user can view all timesheets (HR/Admin)
      const canViewAll = canViewAllTimesheets(authContext);
      
      if (canViewAll.authorized) {
        // Authorized to view all users
        const data = await getDailyHours(user.userId, days, { targetUserIds });
        return Response.json(data);
      }
      
      // Otherwise, check each user individually (for Manager role)
      for (const targetId of targetUserIds) {
        if (targetId === user.userId) continue; // Can always view own data
        
        const authResult = canViewUserTimesheets(authContext, targetId);
        if (!authResult.authorized) {
          return new Response(
            JSON.stringify({ error: 'Forbidden', reason: authResult.reason }), 
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // All requested users are authorized
      const data = await getDailyHours(user.userId, days, { targetUserIds });
      return Response.json(data);
    }
    
    // Default: return own data
    const data = await getDailyHours(user.userId, days);
    return Response.json(data);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
