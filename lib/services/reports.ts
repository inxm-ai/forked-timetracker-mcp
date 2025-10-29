import { db } from "@/drizzle/connection";
import { timeEntries, projects } from "@/drizzle/schema";
import { and, eq, gte, lte, sql, inArray } from "drizzle-orm";

/**
 * Options for report queries that support viewing other users' data
 */
export interface ReportQueryOptions {
  /** The user ID to query. If not provided, uses the authenticated user's ID */
  targetUserId?: string;
  /** Array of user IDs to query (for multi-user reports). Takes precedence over targetUserId */
  targetUserIds?: string[];
}

/**
 * Get dashboard summary for a user
 * @param userId - The authenticated user's ID (for authorization context)
 * @param options - Optional query options to view other users' data
 */
export async function getDashboardSummary(
  userId: string, 
  options?: ReportQueryOptions
) {
  // Determine which user(s) to query
  const queryUserId = options?.targetUserId || userId;
  
  console.log('getDashboardSummary called for userId:', userId, 'queryUserId:', queryUserId);
  
  const [last] = await db
    .select({ last: timeEntries.startTime })
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, queryUserId)))
    .orderBy(sql`start_time DESC`)
    .limit(1);

  console.log('Last activity query result:', last);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total] = await db
    .select({
      minutes: sql<number>`coalesce(sum(${timeEntries.durationMinutes}),0)`
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, queryUserId),
        lte(timeEntries.startTime, new Date()),
        gte(timeEntries.startTime, startOfMonth),
        sql` ${timeEntries.durationMinutes} IS NOT NULL`
      )
    );

  console.log('Total hours query result:', total);

  // Get weekly data
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [weeklyTotal] = await db
    .select({
      minutes: sql<number>`coalesce(sum(${timeEntries.durationMinutes}),0)`
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, queryUserId),
        gte(timeEntries.startTime, startOfWeek),
        sql` ${timeEntries.durationMinutes} IS NOT NULL`
      )
    );

  // Get previous week data for trend calculation
  const startOfPrevWeek = new Date(startOfWeek);
  startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
  
  const endOfPrevWeek = new Date(startOfWeek);
  endOfPrevWeek.setTime(endOfPrevWeek.getTime() - 1); // One millisecond before current week starts

  const [prevWeekTotal] = await db
    .select({
      minutes: sql<number>`coalesce(sum(${timeEntries.durationMinutes}),0)`
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, queryUserId),
        gte(timeEntries.startTime, startOfPrevWeek),
        lte(timeEntries.startTime, endOfPrevWeek),
        sql` ${timeEntries.durationMinutes} IS NOT NULL`
      )
    );

  // Calculate working days this month
  const today = new Date();
  const currentDay = today.getDate();
  let workingDays = 0;
  
  for (let day = 1; day <= currentDay; day++) {
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      workingDays++;
    }
  }

  const weeklyHours = (weeklyTotal?.minutes ?? 0) / 60;
  const prevWeekHours = (prevWeekTotal?.minutes ?? 0) / 60;
  const weeklyTrend = prevWeekHours > 0 ? ((weeklyHours - prevWeekHours) / prevWeekHours) * 100 : 0;
  const totalHours = (total?.minutes ?? 0) / 60;
  const averageDaily = workingDays > 0 ? totalHours / workingDays : 0;

  const result = {
    lastActivity: last?.last ?? null,
    totalHours: totalHours.toFixed(2),
    weeklyHours: weeklyHours.toFixed(2),
    weeklyTrend: weeklyTrend,
    averageDaily: averageDaily.toFixed(2),
    workingDays: workingDays
  };

  return result;
}

/**
 * Get daily hours for a user or multiple users
 * @param userId - The authenticated user's ID (for authorization context)
 * @param days - Number of days to retrieve
 * @param options - Optional query options to view other users' data
 */
export async function getDailyHours(
  userId: string, 
  days: number = 14,
  options?: ReportQueryOptions
) {
  console.log('getDailyHours called for userId:', userId, 'days:', days, 'options:', options);
  
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  console.log('Querying daily hours since:', since);

  // Build user filter condition
  let userCondition;
  if (options?.targetUserIds && options.targetUserIds.length > 0) {
    // Query multiple users
    userCondition = inArray(timeEntries.userId, options.targetUserIds);
  } else if (options?.targetUserId) {
    // Query specific user
    userCondition = eq(timeEntries.userId, options.targetUserId);
  } else {
    // Default to authenticated user
    userCondition = eq(timeEntries.userId, userId);
  }

  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${timeEntries.startTime})`,
      minutes: sql<number>`sum(${timeEntries.durationMinutes})`,
    })
    .from(timeEntries)
    .where(
      and(
        userCondition,
        gte(timeEntries.startTime, since),
        sql` ${timeEntries.durationMinutes} IS NOT NULL`
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`1 ASC`);

  console.log('getDailyHours returning:', rows.length, 'rows:', rows);
  return rows;
}

/**
 * Get hours by project for current month
 * @param userId - The authenticated user's ID (for authorization context)
 * @param options - Optional query options to view other users' data
 */
export async function getHoursByProjectCurrentMonth(
  userId: string,
  options?: ReportQueryOptions
) {
  console.log('getHoursByProjectCurrentMonth called for userId:', userId, 'options:', options);
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  console.log('Querying hours by project since:', startOfMonth);

  // Build user filter condition
  let userCondition;
  if (options?.targetUserIds && options.targetUserIds.length > 0) {
    // Query multiple users
    userCondition = inArray(timeEntries.userId, options.targetUserIds);
  } else if (options?.targetUserId) {
    // Query specific user
    userCondition = eq(timeEntries.userId, options.targetUserId);
  } else {
    // Default to authenticated user
    userCondition = eq(timeEntries.userId, userId);
  }

  const rows = await db
    .select({
      projectId: projects.id,
      projectName: projects.name,
      minutes: sql<number>`sum(${timeEntries.durationMinutes})`
    })
    .from(timeEntries)
    .innerJoin(projects, eq(timeEntries.projectId, projects.id))
    .where(
      and(
        userCondition,
        gte(timeEntries.startTime, startOfMonth),
        sql` ${timeEntries.durationMinutes} IS NOT NULL`
      )
    )
    .groupBy(projects.id, projects.name);

  console.log('getHoursByProjectCurrentMonth returning:', rows.length, 'rows:', rows);
  return rows;
}

/**
 * Get monthly billed hours
 * @param userId - The authenticated user's ID (for authorization context)
 * @param months - Number of months to retrieve
 * @param options - Optional query options to view other users' data
 */
export async function getMonthlyBilledHours(
  userId: string, 
  months: number = 6,
  options?: ReportQueryOptions
) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  // Build user filter condition
  let userCondition;
  if (options?.targetUserIds && options.targetUserIds.length > 0) {
    // Query multiple users
    userCondition = inArray(timeEntries.userId, options.targetUserIds);
  } else if (options?.targetUserId) {
    // Query specific user
    userCondition = eq(timeEntries.userId, options.targetUserId);
  } else {
    // Default to authenticated user
    userCondition = eq(timeEntries.userId, userId);
  }

  const rows = await db
    .select({
      month: sql<string>`date_trunc('month', ${timeEntries.startTime})`,
      minutes: sql<number>`sum(${timeEntries.durationMinutes})`,
    })
    .from(timeEntries)
    .where(
      and(
        userCondition,
        gte(timeEntries.startTime, since),
        sql` ${timeEntries.durationMinutes} IS NOT NULL`
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`1 ASC`);

  return rows;
}
