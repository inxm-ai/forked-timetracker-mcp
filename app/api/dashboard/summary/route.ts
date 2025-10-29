import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUtils";
import { getDashboardSummary } from "@/lib/services/reports";
import { createAuthorizationContext, canViewUserTimesheets } from "@/lib/authorization";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    
    // Check if a specific user's dashboard is requested
    const url = new URL(req.url!);
    const targetUserId = url.searchParams.get("userId");
    
    // If requesting another user's dashboard, check authorization
    if (targetUserId && targetUserId !== user.userId) {
      const authContext = createAuthorizationContext(user.userId, user.role);
      const authResult = canViewUserTimesheets(authContext, targetUserId);
      
      if (!authResult.authorized) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', reason: authResult.reason }), 
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // User is authorized to view the target user's dashboard
      const data = await getDashboardSummary(user.userId, { targetUserId });
      return Response.json(data);
    }
    
    // Default: return own dashboard
    const data = await getDashboardSummary(user.userId);
    return Response.json(data);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
