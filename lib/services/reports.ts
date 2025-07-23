import { db } from "@/drizzle/connection";
import { timeEntries, projects } from "@/drizzle/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export async function getDashboardSummary(userId: string) {
  console.log('getDashboardSummary called for userId:', userId);
  
  const [last] = await db
    .select({ last: timeEntries.startTime })
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, userId)))
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
        eq(timeEntries.userId, userId),
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
        eq(timeEntries.userId, userId),
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
        eq(timeEntries.userId, userId),
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

export async function getDailyHours(userId: string, days: number = 14) {
  console.log('getDailyHours called for userId:', userId, 'days:', days);
  
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  console.log('Querying daily hours since:', since);

  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${timeEntries.startTime})`,
      minutes: sql<number>`sum(${timeEntries.durationMinutes})`,
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.startTime, since),
        sql` ${timeEntries.durationMinutes} IS NOT NULL`
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`1 ASC`);

  console.log('getDailyHours returning:', rows.length, 'rows:', rows);
  return rows;
}

export async function getHoursByProjectCurrentMonth(userId: string) {
  console.log('getHoursByProjectCurrentMonth called for userId:', userId);
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  console.log('Querying hours by project since:', startOfMonth);

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
        eq(timeEntries.userId, userId),
        gte(timeEntries.startTime, startOfMonth),
        sql` ${timeEntries.durationMinutes} IS NOT NULL`
      )
    )
    .groupBy(projects.id, projects.name);

  console.log('getHoursByProjectCurrentMonth returning:', rows.length, 'rows:', rows);
  return rows;
}

export async function getMonthlyBilledHours(userId: string, months: number = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      month: sql<string>`date_trunc('month', ${timeEntries.startTime})`,
      minutes: sql<number>`sum(${timeEntries.durationMinutes})`,
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.startTime, since),
        sql` ${timeEntries.durationMinutes} IS NOT NULL`
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`1 ASC`);

  return rows;
}
