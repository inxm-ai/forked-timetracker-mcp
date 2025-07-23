import { db } from '../../drizzle/connection';
import { projects, clients, timeEntries, type Project, type NewProject } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export class ProjectService {
  
  async createProject(userId: string, data: Omit<NewProject, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    // Verify client exists
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, data.clientId))
      .limit(1);

    if (!client) {
      throw new Error('Client not found');
    }

    const newProject: NewProject = {
      id: nanoid(),
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(projects).values(newProject).returning();
    return created;
  }

  async listProjects(userId: string, clientId?: string, activeOnly: boolean = true): Promise<Project[]> {
    const conditions = [];
    
    if (clientId) {
      conditions.push(eq(projects.clientId, clientId));
    }
    
    if (activeOnly) {
      conditions.push(eq(projects.active, true));
    }

    return conditions.length > 0
      ? db.select().from(projects).where(and(...conditions))
      : db.select().from(projects);
  }

  async getProject(userId: string, projectId: string): Promise<Project | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return project || null;
  }

  async updateProject(
    userId: string, 
    projectId: string, 
    data: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Project | null> {
    // If clientId is being updated, verify it exists
    if (data.clientId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, data.clientId))
        .limit(1);

      if (!client) {
        throw new Error('Client not found');
      }
    }

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    return updated || null;
  }

  async deactivateProject(userId: string, projectId: string): Promise<Project | null> {
    // Check if project has any time entries
    const [timeEntry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.projectId, projectId))
      .limit(1);

    if (timeEntry) {
      throw new Error('Cannot deactivate project that has tracked time entries. Please contact an administrator if you need to deactivate this project.');
    }

    return this.updateProject(userId, projectId, { active: false });
  }

  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(eq(projects.id, projectId));

    return result.rowCount! > 0;
  }

  async getProjectsWithClient(userId: string, activeOnly: boolean = true) {
    const conditions = [];
    
    if (activeOnly) {
      conditions.push(eq(projects.active, true));
    }

    return conditions.length > 0
      ? db
          .select({
            project: projects,
            client: clients,
          })
          .from(projects)
          .innerJoin(clients, eq(projects.clientId, clients.id))
          .where(and(...conditions))
      : db
          .select({
            project: projects,
            client: clients,
          })
          .from(projects)
          .innerJoin(clients, eq(projects.clientId, clients.id));
  }
}