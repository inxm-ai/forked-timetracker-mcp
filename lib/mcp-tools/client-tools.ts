import { z } from "zod";
import { ClientService } from "../services/clients";
import { type Client } from '../../drizzle/schema';
import { createMcpError, createStructuredMcpResponse, McpResponse } from "./utils";

const clientService = new ClientService();

type ClientResponse = {
  client: Client | null;
}
type ClientsResponse = {
  clients: Client[] | null;
}

export const createClientTool = {
  name: "create_client",
  description: "Create a new client",
  schema: {
    name: z.string().min(1, "Client name is required"),
    description: z.string().optional(),
  },
  handler: async (params: { name: string; description?: string }, userId: string): Promise<McpResponse<ClientResponse>> => {
    try {
      const client = await clientService.createClient(userId, params);
      return createStructuredMcpResponse(
        `Client created successfully:\n- ID: ${client.id}\n- Name: ${client.name}\n- Description: ${client.description || 'None'}`,
        { client }
      );
    } catch (error) {
      return createMcpError(
        `Error creating client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};

export const listClientsTool = {
  name: "list_clients",
  description: "List all clients (shared across all users)",
  schema: {
    activeOnly: z.boolean().optional().default(true),
  },
  handler: async (params: { activeOnly?: boolean }, userId: string): Promise<McpResponse<ClientsResponse>> => {
    try {
      const clients = await clientService.listClients(userId, params.activeOnly);
      
      if (clients.length === 0) {
        return createStructuredMcpResponse(
          "No clients found.",
          { clients: [] }
        );
      }

      const clientList = clients.map(client => 
        `- ${client.name} (ID: ${client.id})${client.description ? ` - ${client.description}` : ''}${!client.active ? ' [INACTIVE]' : ''}`
      ).join('\n');

      return createStructuredMcpResponse(
          `Available clients:\n${clientList}`,
          { clients }
        );
    } catch (error) {
      return createMcpError(
        `Error listing clients: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};

export const updateClientTool = {
  name: "update_client",
  description: "Update an existing client",
  schema: {
    clientId: z.string().min(1, "Client ID is required"),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    active: z.boolean().optional(),
  },
  handler: async (params: { clientId: string; name?: string; description?: string; active?: boolean }, userId: string): Promise<McpResponse<ClientResponse>> => {
    try {
      const { clientId, ...updateData } = params;
      const client = await clientService.updateClient(userId, clientId, updateData);
      
      if (!client) {
        return createMcpError("Client not found.");
      }

      return createStructuredMcpResponse(
        `Client updated successfully:\n- ID: ${client.id}\n- Name: ${client.name}\n- Description: ${client.description || 'None'}\n- Active: ${client.active}`,
        { client }
      );
    } catch (error) {
      return createMcpError(
        `Error updating client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};

export const deactivateClientTool = {
  name: "deactivate_client",
  description: "Deactivate a client (soft delete)",
  schema: {
    clientId: z.string().min(1, "Client ID is required"),
  },
  handler: async (params: { clientId: string }, userId: string): Promise<McpResponse<ClientResponse>> => {
    try {
      const client = await clientService.deactivateClient(userId, params.clientId);
      
      if (!client) {
        return createMcpError("Client not found.");
      }

      return createStructuredMcpResponse(
        `Client "${client.name}" has been deactivated successfully.`,
        { client }
      );    
    } catch (error) {
      return createMcpError(
        `Error deactivating client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};