import { NextRequest } from "next/server";
import { getAuthenticatedUserOrNull } from "@/lib/authUtils";
import { getExternalAuthMode } from "@/lib/external-auth";

/**
 * Get session information that works with both Better Auth and proxy auth
 * This endpoint can be called from client-side code to check authentication status
 */
export async function GET(req: NextRequest) {
  try {
    const mode = getExternalAuthMode();
    
    // For proxy mode, always check via headers
    // For better-auth mode, this will fall back to Better Auth session
    const user = await getAuthenticatedUserOrNull(req);
    
    if (!user) {
      return Response.json({ session: null, mode });
    }
    
    return Response.json({
      session: {
        user: {
          id: user.userId,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      mode
    });
  } catch (error) {
    console.error('Session check error:', error);
    return Response.json({ session: null, mode: getExternalAuthMode() });
  }
}
