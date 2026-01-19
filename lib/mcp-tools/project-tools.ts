import { z } from "zod";
import { ProjectService } from "../services/projects";
import { type Project, type NewProject, user } from '../../drizzle/schema';
import { createMcpError, createStructuredMcpResponse, McpResponse } from "./utils";
import { input } from "@testing-library/user-event/dist/cjs/event/index.js";

const projectService = new ProjectService();

type ProjectResponse = {
  project: Project | null;
}
type ProjectsResponse = {
  projects: Project[] | null;
}

export const createProjectTool = {
  name: "create_project",
  description: "Create a new project for a client",
  inputSchema: {
    name: z.string().min(1, "Project name is required"),
    clientId: z.string().min(1, "Client ID is required"),
    description: z.string().optional(),
    hourlyRate: z.number().positive().optional(),
  },
  outputSchema: {
    project: z.object({
      id: z.string(),
      name: z.string(),
      clientId: z.string(),
      description: z.string().nullable(),
      userId: z.string(),
      hourlyRate: z.string().nullable(),
      active: z.boolean(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }).nullable(),
  },
  handler: async (params: { name: string; clientId: string; description?: string; hourlyRate?: number }, userId: string): Promise<McpResponse<ProjectResponse>> => {
    try {
      const projectData = {
        ...params,
        hourlyRate: params.hourlyRate?.toString(),
      };
      const project = await projectService.createProject(userId, projectData);
      return createStructuredMcpResponse(
        `Project created successfully:\n- ID: ${project.id}\n- Name: ${project.name}\n- Client ID: ${project.clientId}\n- Description: ${project.description || 'None'}\n- Hourly Rate: ${project.hourlyRate ? `$${project.hourlyRate}` : 'None'}`,
        { project }
      );
    } catch (error) {
      return createMcpError(
        `Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};

export const listProjectsTool = {
  name: "list_projects",
  description: "List all projects (shared across all users), optionally filtered by client",
  inputSchema: {
    clientId: z.string().optional(),
    activeOnly: z.boolean().optional().default(true),
    withClient: z.boolean().optional().default(false),
  },
  outputSchema: {
    projects: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        clientId: z.string(),
        description: z.string().nullable(),
        userId: z.string(),
        hourlyRate: z.string().nullable(),
        active: z.boolean(),
        createdAt: z.date(),
        updatedAt: z.date(),
      })
    ).nullable(),
  },
  handler: async (params: { clientId?: string; activeOnly?: boolean; withClient?: boolean }, userId: string): Promise<McpResponse<ProjectsResponse>> => {
    try {
      if (params.withClient) {
        const projectsWithClient = await projectService.getProjectsWithClient(userId, params.activeOnly);
        
        if (projectsWithClient.length === 0) {
          return createStructuredMcpResponse(
            "No projects found.",
            { projects: [] }
          );
        }

        const projectList = projectsWithClient.map(({ project, client }) => 
          `- ${project.name} (ID: ${project.id}) - Client: ${client.name}${project.description ? ` - ${project.description}` : ''}${project.hourlyRate ? ` - $${project.hourlyRate}/hr` : ''}${!project.active ? ' [INACTIVE]' : ''}`
        ).join('\n');

        return createStructuredMcpResponse(
          `Available projects:\n${projectList}`,
          { projects: projectsWithClient.map(pwc => pwc.project) }
        );
      } else {
        const projects = await projectService.listProjects(userId, params.clientId, params.activeOnly);
        
        if (projects.length === 0) {
          return createStructuredMcpResponse(
            "No projects found.",
            { projects: [] }
          );
        }

        const projectList = projects.map(project => 
          `- ${project.name} (ID: ${project.id})${project.description ? ` - ${project.description}` : ''}${project.hourlyRate ? ` - $${project.hourlyRate}/hr` : ''}${!project.active ? ' [INACTIVE]' : ''}`
        ).join('\n');

        return createStructuredMcpResponse(
          `Available projects:\n${projectList}`,
          { projects }
        );
      }
    } catch (error) {
      return createMcpError(
        `Error listing projects: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};

export const updateProjectTool = {
  name: "update_project",
  description: "Update an existing project",
  inputSchema: {
    projectId: z.string().min(1, "Project ID is required"),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    clientId: z.string().optional(),
    hourlyRate: z.number().positive().optional(),
    active: z.boolean().optional(),
  },
  outputSchema: {
    project: z.object({
      id: z.string(),
      name: z.string(),
      clientId: z.string(),
      description: z.string().nullable(),
      userId: z.string(),
      hourlyRate: z.string().nullable(),
      active: z.boolean(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }).nullable(),
  },
  handler: async (params: { projectId: string; name?: string; description?: string; clientId?: string; hourlyRate?: number; active?: boolean }, userId: string): Promise<McpResponse<ProjectResponse>> => {
    try {
      const { projectId, hourlyRate, ...restData } = params;
      const updateData = {
        ...restData,
        ...(hourlyRate !== undefined && { hourlyRate: hourlyRate.toString() }),
      };
      const project = await projectService.updateProject(userId, projectId, updateData);
      
      if (!project) {
        return createMcpError("Project not found.");
      }

      return createStructuredMcpResponse(
        `Project updated successfully:\n- ID: ${project.id}\n- Name: ${project.name}\n- Client ID: ${project.clientId}\n- Description: ${project.description || 'None'}\n- Hourly Rate: ${project.hourlyRate ? `$${project.hourlyRate}` : 'None'}\n- Active: ${project.active}`,
        { project }
      )
    } catch (error) {
      return createMcpError(
        `Error updating project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};

export const deactivateProjectTool = {
  name: "deactivate_project",
  description: "Deactivate a project (soft delete)",
  inputSchema: {
    projectId: z.string().min(1, "Project ID is required"),
  },
  outputSchema: {
    project: z.object({
      id: z.string(),
      name: z.string(),
      clientId: z.string(),
      description: z.string().nullable(),
      userId: z.string(),
      hourlyRate: z.string().nullable(),
      active: z.boolean(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }).nullable(),
  },
  handler: async (params: { projectId: string }, userId: string): Promise<McpResponse<ProjectResponse>> => {
    try {
      const project = await projectService.deactivateProject(userId, params.projectId);
      
      if (!project) {
        return createMcpError("Project not found.");
      }

      return createStructuredMcpResponse(
        `Project "${project.name}" has been deactivated successfully.`,
        { project }
      );
    } catch (error) {
      return createMcpError(
        `Error deactivating project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
};