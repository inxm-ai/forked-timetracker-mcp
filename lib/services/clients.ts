import { db } from '../../drizzle/connection';
import { clients, projects, timeEntries, type Client, type NewClient } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export class ClientService {
  
  async createClient(userId: string, data: Omit<NewClient, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const newClient: NewClient = {
      id: nanoid(),
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(clients).values(newClient).returning();
    return created;
  }

  async listClients(userId: string, activeOnly: boolean = true): Promise<Client[]> {
    const conditions = [];
    
    if (activeOnly) {
      conditions.push(eq(clients.active, true));
    }

    return conditions.length > 0 
      ? db.select().from(clients).where(and(...conditions))
      : db.select().from(clients);
  }

  async getClient(userId: string, clientId: string): Promise<Client | null> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    return client || null;
  }

  async updateClient(
    userId: string, 
    clientId: string, 
    data: Partial<Omit<Client, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Client | null> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, clientId))
      .returning();

    return updated || null;
  }

  async deactivateClient(userId: string, clientId: string): Promise<Client | null> {
    // Check if client has any time entries through its projects
    const timeEntriesCount = await db
      .select()
      .from(timeEntries)
      .innerJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(eq(projects.clientId, clientId))
      .limit(1);

    if (timeEntriesCount.length > 0) {
      throw new Error('Cannot deactivate client that has tracked time entries. Please contact an administrator if you need to deactivate this client.');
    }

    return this.updateClient(userId, clientId, { active: false });
  }

  async deleteClient(userId: string, clientId: string): Promise<boolean> {
    const result = await db
      .delete(clients)
      .where(eq(clients.id, clientId));

    return result.rowCount! > 0;
  }
}