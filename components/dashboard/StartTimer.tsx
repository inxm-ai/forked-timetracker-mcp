'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Clock, Loader2 } from 'lucide-react';
import useSWR, { mutate } from 'swr';

interface Project {
  id: string;
  name: string;
  clientName: string;
}

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Failed to fetch');
  return r.json();
});

interface StartTimerProps {
  mode?: 'header' | 'standalone';
}

export default function StartTimer({ mode = 'header' }: StartTimerProps) {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: projects, error } = useSWR<Project[]>('/api/projects', fetcher);

  const handleStartTimer = async () => {
    if (!selectedProject || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject,
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      // Reset form
      setSelectedProject('');
      setDescription('');
      
      // Refresh the active timer data
      await mutate('/api/time-entries/active');
      await mutate('/api/time-entries');
    } catch (error) {
      console.error('Error starting timer:', error);
      alert(`Failed to start timer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    if (mode === 'header') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
          <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-600 dark:text-red-400">Unable to load projects</span>
        </div>
      );
    } else {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <Clock className="h-5 w-5" />
              <span>Unable to load projects</span>
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  if (!projects) {
    if (mode === 'header') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading projects...</span>
        </div>
      );
    } else {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading projects...</span>
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  if (projects.length === 0) {
    if (mode === 'header') {
      return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No projects available</span>
        </div>
      );
    } else {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span>No projects available</span>
            </div>
          </CardContent>
        </Card>
      );
    }
  }

  // Header mode - compact horizontal layout
  if (mode === 'header') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="h-8 text-sm border-none bg-transparent focus:ring-0 focus:ring-offset-0 p-0">
            <SelectValue placeholder="Select project to start timer" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground">{project.clientName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleStartTimer}
          disabled={!selectedProject || isLoading}
          size="sm"
          className="h-8 px-3"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
      </div>
    );
  }

  // Standalone mode - expanded vertical layout
  return (
    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3 px-4 md:px-6">
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Play className="h-5 w-5" />
          Select project to start timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6">
        <div className="space-y-2">
          <Label htmlFor="project-select">Project</Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger id="project-select" className="h-11 bg-white dark:bg-gray-950">
              <SelectValue placeholder="Choose a project to track time" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-xs text-muted-foreground">{project.clientName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="What are you working on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px] bg-white dark:bg-gray-950 resize-none"
          />
        </div>

        <Button 
          onClick={handleStartTimer}
          disabled={!selectedProject || isLoading}
          size="lg"
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Play className="h-5 w-5 mr-2" />
          )}
          {isLoading ? 'Starting Timer...' : 'Start Timer'}
        </Button>
      </CardContent>
    </Card>
  );
}