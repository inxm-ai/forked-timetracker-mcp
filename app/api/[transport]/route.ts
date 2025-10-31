import { auth } from "@/lib/auth";
import { createMcpHandler } from "mcp-handler";

// Tricking typescript into exporting the correct types
type McpRegisterFn = Parameters<typeof createMcpHandler>[0];
type McpServer = Parameters<McpRegisterFn>[0];
import { withMcpAuth } from "better-auth/plugins";
import { env } from "@/lib/env";
import { getExternalAuthMode, authenticateViaProxy } from "@/lib/external-auth";
import { db } from "@/drizzle/connection";
import { user as userTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

// Import MCP tools
import {
	createClientTool,
	listClientsTool,
	updateClientTool,
	deactivateClientTool,
} from "@/lib/mcp-tools/client-tools";
import {
	createProjectTool,
	listProjectsTool,
	updateProjectTool,
	deactivateProjectTool,
} from "@/lib/mcp-tools/project-tools";
import {
	startTimeTrackingTool,
	stopTimeTrackingTool,
	getActiveTimeEntryTool,
	addManualTimeEntryTool,
	updateTimeEntryTool,
} from "@/lib/mcp-tools/time-tracking-tools";
import {
	listTimeEntresTool,
	getTimeSummaryTool,
	calculateEarningsTool,
} from "@/lib/mcp-tools/report-tools";
import { NextRequest } from "next/server";

// Helper that registers all tools for a given userId and role onto the MCP server
function registerToolsForUser(server: McpServer, userId: string, userRole?: string | null) {
	// Pass role to tools that need it for authorization
	// For now, tools receive userId; they can fetch role if needed
	// In the future, we can pass role directly to tool handlers
	
	// Client management tools
	server.registerTool(
		createClientTool.name,
		{
			title: createClientTool.name,
			description: createClientTool.description,
			inputSchema: createClientTool.inputSchema,
			outputSchema: createClientTool.outputSchema,
		},
		async (params) => createClientTool.handler(params, userId)
	);

	server.registerTool(
		listClientsTool.name,
		{
			title: listClientsTool.name,
			description: listClientsTool.description,
			inputSchema: listClientsTool.inputSchema,
			outputSchema: listClientsTool.outputSchema,
		},
		async (params) => listClientsTool.handler(params, userId)
	);

	server.registerTool(
		updateClientTool.name,
		{
			title: updateClientTool.name,
			description: updateClientTool.description,
			inputSchema: updateClientTool.inputSchema,
			outputSchema: updateClientTool.outputSchema,
		},
		async (params) => updateClientTool.handler(params, userId)
	);

	server.registerTool(
		deactivateClientTool.name,
		{
			title: deactivateClientTool.name,
			description: deactivateClientTool.description,
			inputSchema: deactivateClientTool.inputSchema,
			outputSchema: deactivateClientTool.outputSchema,
		},
		async (params) => deactivateClientTool.handler(params, userId)
	);

	// Project management tools
	server.registerTool(
		createProjectTool.name,
		{
			title: createProjectTool.name,
			description: createProjectTool.description,
			inputSchema: createProjectTool.inputSchema,
			outputSchema: createProjectTool.outputSchema,
		},
		async (params) => createProjectTool.handler(params, userId)
	);

	server.registerTool(
		listProjectsTool.name,
		{
			title: listProjectsTool.name,
			description: listProjectsTool.description,
			inputSchema: listProjectsTool.inputSchema,
			outputSchema: listProjectsTool.outputSchema,
		},
		async (params) => listProjectsTool.handler(params, userId)
	);

	server.registerTool(
		updateProjectTool.name,
		{
			title: updateProjectTool.name,
			description: updateProjectTool.description,
			inputSchema: updateProjectTool.inputSchema,
			outputSchema: updateProjectTool.outputSchema,
		},
		async (params) => updateProjectTool.handler(params, userId)
	);

	server.registerTool(
		deactivateProjectTool.name,
		{
			title: deactivateProjectTool.name,
			description: deactivateProjectTool.description,
			inputSchema: deactivateProjectTool.inputSchema,
			outputSchema: deactivateProjectTool.outputSchema,
		},
		async (params) => deactivateProjectTool.handler(params, userId)
	);

	// Time tracking tools
	server.registerTool(
		startTimeTrackingTool.name,
		{
			title: startTimeTrackingTool.name,
			description: startTimeTrackingTool.description,
			inputSchema: startTimeTrackingTool.inputSchema,
			outputSchema: startTimeTrackingTool.outputSchema,
		},
		async (params) => startTimeTrackingTool.handler(params, userId)
	);

	server.registerTool(
		stopTimeTrackingTool.name,
		{
			title: stopTimeTrackingTool.name,
			description: stopTimeTrackingTool.description,
			inputSchema: stopTimeTrackingTool.inputSchema,
			outputSchema: stopTimeTrackingTool.outputSchema,
		},
		async (params) => stopTimeTrackingTool.handler(params, userId)
	);

	server.registerTool(
		getActiveTimeEntryTool.name,
		{
			title: getActiveTimeEntryTool.name,
			description: getActiveTimeEntryTool.description,
			inputSchema: getActiveTimeEntryTool.inputSchema,
			outputSchema: getActiveTimeEntryTool.outputSchema,
		},
		async (params) => getActiveTimeEntryTool.handler(params, userId)
	);

	server.registerTool(
		addManualTimeEntryTool.name,
		{
			title: addManualTimeEntryTool.name,
			description: addManualTimeEntryTool.description,
			inputSchema: addManualTimeEntryTool.inputSchema,
			outputSchema: addManualTimeEntryTool.outputSchema,
		},
		async (params) => addManualTimeEntryTool.handler(params, userId)
	);

	server.registerTool(
		updateTimeEntryTool.name,
		{
			title: updateTimeEntryTool.name,
			description: updateTimeEntryTool.description,
			inputSchema: updateTimeEntryTool.inputSchema,
			outputSchema: updateTimeEntryTool.outputSchema,
		},
		async (params) => updateTimeEntryTool.handler(params, userId)
	);

	// Reporting tools
	server.registerTool(
		listTimeEntresTool.name,
		{
			title: listTimeEntresTool.name,
			description: listTimeEntresTool.description,
			inputSchema: listTimeEntresTool.inputSchema,
			outputSchema: listTimeEntresTool.outputSchema,
		},
		async (params) => listTimeEntresTool.handler(params, userId)
	);

	server.registerTool(
		getTimeSummaryTool.name,
		{
			title: getTimeSummaryTool.name,
			description: getTimeSummaryTool.description,
			inputSchema: getTimeSummaryTool.inputSchema,
			outputSchema: getTimeSummaryTool.outputSchema,
		},
		async (params) => getTimeSummaryTool.handler(params, userId)
	);

	server.registerTool(
		calculateEarningsTool.name,
		{
			title: calculateEarningsTool.name,
			description: calculateEarningsTool.description,
			inputSchema: calculateEarningsTool.inputSchema,
			outputSchema: calculateEarningsTool.outputSchema,
		},
		async (params) => calculateEarningsTool.handler(params, userId)
	);
}

// Shared capabilities object
const capabilities = {
	capabilities: {
		tools: {
			// Client management
			[createClientTool.name]: { description: createClientTool.description },
			[listClientsTool.name]: { description: listClientsTool.description },
			[updateClientTool.name]: { description: updateClientTool.description },
			[deactivateClientTool.name]: { description: deactivateClientTool.description },

			// Project management
			[createProjectTool.name]: { description: createProjectTool.description },
			[listProjectsTool.name]: { description: listProjectsTool.description },
			[updateProjectTool.name]: { description: updateProjectTool.description },
			[deactivateProjectTool.name]: { description: deactivateProjectTool.description },

			// Time tracking
			[startTimeTrackingTool.name]: { description: startTimeTrackingTool.description },
			[stopTimeTrackingTool.name]: { description: stopTimeTrackingTool.description },
			[getActiveTimeEntryTool.name]: { description: getActiveTimeEntryTool.description },
			[addManualTimeEntryTool.name]: { description: addManualTimeEntryTool.description },
			[updateTimeEntryTool.name]: { description: updateTimeEntryTool.description },

			// Reporting
			[listTimeEntresTool.name]: { description: listTimeEntresTool.description },
			[getTimeSummaryTool.name]: { description: getTimeSummaryTool.description },
			[calculateEarningsTool.name]: { description: calculateEarningsTool.description },
		},
	},
};

// Create an MCP handler for a given local userId and role
function createHandlerForUser(userId: string, userRole?: string | null) {
	return createMcpHandler(
		(server) => registerToolsForUser(server, userId, userRole),
		{
			...capabilities,
		},
		{
			redisUrl: env.REDIS_URL,
			basePath: "/api",
			verboseLogs: true,
			maxDuration: 60,
		},
	);
}

// Universal handler that accepts API key, proxy auth, or falls back to OAuth via withMcpAuth
const universalHandler = async (req: Request) => {
	// First: check for API key header
	const headerKey = (req.headers.get && (req.headers.get('x-api-key') || req.headers.get('authorization'))) || null;
	if (headerKey) {
		let keyValue = headerKey;
		if (typeof keyValue === 'string' && keyValue.toLowerCase().startsWith('bearer ')) {
			keyValue = keyValue.slice(7).trim();
		}

		if (env.MCP_API_KEY && keyValue === env.MCP_API_KEY) {
			const userId = env.MCP_API_USER_ID || env.SEED_USER_ID || 'service-user';
			// API key users get admin role by default
			const handler = createHandlerForUser(userId, 'admin');
			return handler(req);
		}
	}

	// Second: check for proxy authentication (if enabled)
	const externalAuthMode = getExternalAuthMode();
	if (externalAuthMode === 'proxy') {
		try {
			const proxyAuth = await authenticateViaProxy(req as NextRequest);
			if (proxyAuth.success && proxyAuth.userId) {
				// Extract role from JWT or fetch from database
				let userRole = proxyAuth.userInfo?.role || 
				              (proxyAuth.userInfo?.roles && proxyAuth.userInfo.roles.length > 0 
				                ? proxyAuth.userInfo.roles[0] 
				                : null);
				
				// If no role from JWT, fetch from database
				if (!userRole) {
					const [user] = await db
						.select({ role: userTable.role })
						.from(userTable)
						.where(eq(userTable.id, proxyAuth.userId))
						.limit(1);
					userRole = user?.role || null;
				}
				
				const handler = createHandlerForUser(proxyAuth.userId, userRole);
				return handler(req);
			}
			// If proxy auth fails, log and fall through to Better Auth
			console.warn('Proxy authentication failed in MCP handler:', proxyAuth.error);
		} catch (error) {
			console.error('Error during proxy authentication in MCP handler:', error);
		}
	}

	// Fallback to normal OAuth/session-based auth
	return withMcpAuth(auth, async (req, session) => {
		const userId = session.userId;
		if (!userId) {
			throw new Error('User ID not available in session');
		}

		// Fetch user role from database for Better Auth sessions
		const [user] = await db
			.select({ role: userTable.role })
			.from(userTable)
			.where(eq(userTable.id, userId))
			.limit(1);
		
		const userRole = user?.role || null;
		const handler = createHandlerForUser(userId, userRole);
		return handler(req);
	})(req);
};

export { universalHandler as GET, universalHandler as POST, universalHandler as DELETE };
