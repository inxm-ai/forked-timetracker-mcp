import { db } from '../../drizzle/connection';
import { timeEntries, projects, clients, type TimeEntry, type NewTimeEntry } from '../../drizzle/schema';
import { eq, and, isNotNull, desc, gte, lte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export class TimeEntryService {
  
  async startTimeTracking(
    userId: string, 
    projectId: string, 
    description: string
  ): Promise<TimeEntry> {
    // Verify project belongs to user
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    if (!project) {
      throw new Error('Project not found or does not belong to user');
    }

    // Check if there's already an active time entry
    const [activeEntry] = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, userId), eq(timeEntries.isActive, true)))
      .limit(1);

    if (activeEntry) {
      throw new Error('There is already an active time entry. Stop it first.');
    }

    const newEntry: NewTimeEntry = {
      id: nanoid(),
      projectId,
      userId,
      description,
      startTime: new Date(),
      endTime: null,
      durationMinutes: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(timeEntries).values(newEntry).returning();
    return created;
  }

  async stopTimeTracking(userId: string, entryId?: string): Promise<TimeEntry | null> {
    const conditions = [eq(timeEntries.userId, userId), eq(timeEntries.isActive, true)];
    
    if (entryId) {
      conditions.push(eq(timeEntries.id, entryId));
    }

    const [activeEntry] = await db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
      .limit(1);

    if (!activeEntry) {
      throw new Error('No active time entry found');
    }

    const endTime = new Date();
    const durationMinutes = Math.round(
      (endTime.getTime() - activeEntry.startTime.getTime()) / (1000 * 60)
    );

    const [updated] = await db
      .update(timeEntries)
      .set({
        endTime,
        durationMinutes,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, activeEntry.id))
      .returning();

    return updated;
  }

  async getActiveTimeEntry(userId: string): Promise<TimeEntry | null> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, userId), eq(timeEntries.isActive, true)))
      .limit(1);

    return entry || null;
  }

  async addManualTimeEntry(
    userId: string,
    projectId: string,
    description: string,
    startTime: Date,
    endTime: Date
  ): Promise<TimeEntry> {
    // Verify project belongs to user
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    if (!project) {
      throw new Error('Project not found or does not belong to user');
    }

    if (endTime <= startTime) {
      throw new Error('End time must be after start time');
    }

    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    );

    const newEntry: NewTimeEntry = {
      id: nanoid(),
      projectId,
      userId,
      description,
      startTime,
      endTime,
      durationMinutes,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(timeEntries).values(newEntry).returning();
    return created;
  }

  async listTimeEntries(
    userId: string,
    projectId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<TimeEntry[]> {
    const conditions = [eq(timeEntries.userId, userId)];
    
    if (projectId) {
      conditions.push(eq(timeEntries.projectId, projectId));
    }
    
    if (startDate) {
      conditions.push(gte(timeEntries.startTime, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(timeEntries.startTime, endDate));
    }

    return db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
      .orderBy(desc(timeEntries.startTime))
      .limit(limit);
  }

  async getTimeEntriesWithDetails(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ) {
    const conditions = [eq(timeEntries.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(timeEntries.startTime, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(timeEntries.startTime, endDate));
    }

    return db
      .select({
        timeEntry: timeEntries,
        project: projects,
        client: clients,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(timeEntries.startTime))
      .limit(limit);
  }

  async getTimeSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const conditions = [
      eq(timeEntries.userId, userId),
      isNotNull(timeEntries.endTime) // Only completed entries
    ];
    
    if (startDate) {
      conditions.push(gte(timeEntries.startTime, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(timeEntries.startTime, endDate));
    }

    const result = await db
      .select({
        clientName: clients.name,
        projectName: projects.name,
        totalMinutes: sql<number>`sum(${timeEntries.durationMinutes})`,
        totalHours: sql<number>`round(sum(${timeEntries.durationMinutes}) / 60.0, 2)`,
        entryCount: sql<number>`count(*)`,
      })
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(and(...conditions))
      .groupBy(clients.name, projects.name)
      .orderBy(desc(sql`sum(${timeEntries.durationMinutes})`));

    return result;
  }

  async updateTimeEntry(
    userId: string,
    entryId: string,
    data: Partial<Omit<TimeEntry, 'id' | 'userId' | 'createdAt'>>
  ): Promise<TimeEntry | null> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    // Recalculate duration if start or end time changed
    if (data.startTime || data.endTime) {
      const [currentEntry] = await db
        .select()
        .from(timeEntries)
        .where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)))
        .limit(1);

      if (!currentEntry) {
        return null;
      }

      const startTime = data.startTime || currentEntry.startTime;
      const endTime = data.endTime || currentEntry.endTime;

      if (endTime && startTime) {
        updateData.durationMinutes = Math.round(
          (endTime.getTime() - startTime.getTime()) / (1000 * 60)
        );
      }
    }

    const [updated] = await db
      .update(timeEntries)
      .set(updateData)
      .where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)))
      .returning();

    return updated || null;
  }

  async deleteTimeEntry(userId: string, entryId: string): Promise<boolean> {
    const result = await db
      .delete(timeEntries)
      .where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)));

    return result.rowCount! > 0;
  }
}