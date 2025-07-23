'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Square, Clock } from 'lucide-react';
import useSWR, { mutate } from 'swr';
import StartTimer from './StartTimer';

interface ActiveTimeEntry {
  id: string;
  projectName: string;
  description: string;
  startTime: string;
  isActive: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Failed to fetch');
  return r.json();
});

interface ActiveTimerProps {
  mode?: 'header' | 'standalone';
}

export default function ActiveTimer({ mode = 'header' }: ActiveTimerProps) {
  const { data: activeEntry, error } = useSWR<ActiveTimeEntry>('/api/time-entries/active', fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeEntry?.isActive && activeEntry.startTime) {
      const startTime = new Date(activeEntry.startTime).getTime();
      
      const updateElapsed = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [activeEntry]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerAction = async (action: 'pause' | 'stop') => {
    if (!activeEntry?.id || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/time-entries/active', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} timer`);
      }

      // Refresh the active timer data
      await mutate('/api/time-entries/active');
      
      // Also refresh any other time entry lists that might be affected
      // We need to invalidate all time-entries queries since we don't know the exact URL
      await mutate((key) => typeof key === 'string' && key.startsWith('/api/time-entries?'));
      
      // Emit custom event when timer is stopped
      if (action === 'stop') {
        console.log('Dispatching timerStopped event for entry:', activeEntry.id);
        // Add a small delay to ensure the backend has completed the update
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('timerStopped', {
            detail: { entryId: activeEntry.id }
          }));
        }, 100);
      }
    } catch (error) {
      console.error(`Error ${action}ing timer:`, error);
      // You could add toast notifications here
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
        <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
        <span className="text-sm text-red-600 dark:text-red-400">Timer Error</span>
      </div>
    );
  }

  if (!activeEntry || !activeEntry.isActive) {
    return <StartTimer mode={mode} />;
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
      {/* Active indicator */}
      <div className="relative">
        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
        <div className="absolute inset-0 h-2 w-2 bg-emerald-500 rounded-full animate-ping opacity-75" />
      </div>
      
      {/* Project name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100 truncate block">
          {activeEntry.projectName}
        </span>
      </div>
      
      {/* Timer display */}
      <div className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-300">
        {formatTime(elapsedTime)}
      </div>
      
      {/* Stop button */}
      <Button 
        size="sm" 
        variant="destructive" 
        className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 shadow-sm" 
        disabled={isLoading}
        onClick={() => handleTimerAction('stop')}
      >
        <Square className="h-3 w-3" />
      </Button>
    </div>
  );
}