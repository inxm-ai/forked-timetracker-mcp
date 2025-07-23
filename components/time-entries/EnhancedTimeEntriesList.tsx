'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MultiSelect, type Option } from '@/components/ui/multi-select-simple';
import { UserAvatar } from '@/components/ui/user-avatar';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Play,
  BarChart3,
  ArrowRight,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';

interface TimeEntry {
  id: string | number;
  projectId: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  projectName: string;
  clientName?: string;
  description: string;
  durationMinutes: number;
  isActive: boolean;
}

interface TimeEntryList {
  entries: TimeEntry[];
  total: number;
}

interface Project {
  id: string;
  name: string;
  clientName: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  entryCount: number;
}

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Failed to fetch');
  return r.json();
});

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for responsive calendar
function useResponsiveCalendar() {
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return isMobile;
}

// Unified time formatting function
function formatDuration(minutes: number): string {
  if (!minutes || minutes === 0) return '0s';
  
  const totalSeconds = Math.round(minutes * 60);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else if (mins > 0) {
    return `${mins}m`;
  } else {
    return `${secs}s`;
  }
}

// Helper function to get user display name
function getUserDisplayName(userId: string, users: User[]): string {
  const user = users.find(u => u.id === userId);
  return user ? user.name : userId;
}

// Helper function to get user image
function getUserImage(userId: string, users: User[]): string | null {
  const user = users.find(u => u.id === userId);
  return user ? user.image || null : null;
}


interface EnhancedTimeEntriesListProps {
  mode?: 'dashboard' | 'full';
  maxEntries?: number;
}

export default function EnhancedTimeEntriesList({ mode = 'full', maxEntries = 10 }: EnhancedTimeEntriesListProps = {}) {
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]); // Array of user IDs, empty means current user only
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'project'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(mode === 'dashboard' ? (maxEntries || 5) : 10);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Responsive calendar hook
  const isMobile = useResponsiveCalendar();

  // Build API URL with query parameters
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());
    
    if (mode === 'dashboard') {
      // For dashboard mode, just get recent entries
      params.set('sortBy', 'date');
      params.set('sortOrder', 'desc');
    } else {
      // For full mode, use all filters
      if (debouncedSearchTerm) {
        params.set('search', debouncedSearchTerm);
      }
      
      if (selectedProjects.length > 0) {
        if (selectedProjects.includes('all')) {
          params.set('projects', 'all');
        } else {
          params.set('projects', selectedProjects.join(','));
        }
      }
      
      if (selectedUsers.length > 0) {
        if (selectedUsers.includes('all')) {
          params.set('users', 'all');
        } else {
          params.set('users', selectedUsers.join(','));
        }
      }
      
      if (dateRange.from && dateRange.to) {
        params.set('dateFrom', dateRange.from.toISOString().split('T')[0]);
        params.set('dateTo', dateRange.to.toISOString().split('T')[0]);
      }
      
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
    }
    
    return `/api/time-entries?${params.toString()}`;
  }, [mode, page, pageSize, debouncedSearchTerm, selectedProjects, selectedUsers, dateRange, sortBy, sortOrder]);

  // Memoize the current API URL to prevent unnecessary re-fetches
  const currentApiUrl = useMemo(() => buildApiUrl(), [buildApiUrl]);

  // Fetch data
  const { data: timeEntriesData, error: entriesError } = useSWR<TimeEntryList>(
    currentApiUrl,
    fetcher
  );

  const { data: projectsData, error: projectsError } = useSWR<Project[]>(
    '/api/projects',
    fetcher
  );

  const { data: usersData, error: usersError } = useSWR<User[]>(
    '/api/users',
    fetcher
  );

  const { data: activeEntry } = useSWR('/api/time-entries/active', fetcher);

  // Filter out active entries - they should only appear in the sidebar
  const displayEntries = useMemo(() => {
    if (!timeEntriesData?.entries) return [];
    return timeEntriesData.entries.filter(entry => !entry.isActive);
  }, [timeEntriesData?.entries]);

  // Calculate total pages from server response
  const totalPages = Math.ceil((timeEntriesData?.total || 0) / pageSize);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedProjects([]);
    setSelectedUsers([]);
    setDateRange({});
    setPage(1);
  }, []);

  // Utility function to escape CSV fields
  const escapeCSVField = (field: string | null | undefined): string => {
    if (!field) return '';
    const stringField = String(field);
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  // Function to fetch all entries with current filters (no pagination)
  const fetchAllEntries = useCallback(async (): Promise<TimeEntry[]> => {
    const params = new URLSearchParams();
    params.set('limit', '10000'); // Large limit to get all entries
    params.set('page', '1');
    
    if (debouncedSearchTerm) {
      params.set('search', debouncedSearchTerm);
    }
    
    if (selectedProjects.length > 0) {
      if (selectedProjects.includes('all')) {
        params.set('projects', 'all');
      } else {
        params.set('projects', selectedProjects.join(','));
      }
    }
    
    if (selectedUsers.length > 0) {
      if (selectedUsers.includes('all')) {
        params.set('users', 'all');
      } else {
        params.set('users', selectedUsers.join(','));
      }
    }
    
    if (dateRange.from && dateRange.to) {
      params.set('dateFrom', dateRange.from.toISOString().split('T')[0]);
      params.set('dateTo', dateRange.to.toISOString().split('T')[0]);
    }
    
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    
    const response = await fetch(`/api/time-entries?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch entries for export');
    }
    
    const data: TimeEntryList = await response.json();
    return data.entries.filter(entry => !entry.isActive);
  }, [debouncedSearchTerm, selectedProjects, selectedUsers, dateRange, sortBy, sortOrder]);

  // Function to generate CSV content
  const generateCSV = useCallback((entries: TimeEntry[]): string => {
    const headers = [
      'Date',
      'Start Time',
      'End Time',
      'Duration',
      'Project',
      'Client',
      'User',
      'Description'
    ];
    
    const csvRows = [headers.join(',')];
    
    entries.forEach(entry => {
      const startDate = new Date(entry.startTime);
      const endDate = entry.endTime ? new Date(entry.endTime) : null;
      const userName = getUserDisplayName(entry.userId, usersData || []);
      
      const row = [
        format(startDate, 'yyyy-MM-dd'),
        format(startDate, 'HH:mm'),
        endDate ? format(endDate, 'HH:mm') : 'Active',
        formatDuration(entry.durationMinutes || 0),
        escapeCSVField(entry.projectName),
        escapeCSVField(entry.clientName || ''),
        escapeCSVField(userName),
        escapeCSVField(entry.description)
      ];
      
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }, [usersData]);

  // Function to download CSV file
  const downloadCSV = useCallback((csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, []);

  // Export functionality
  const handleExport = useCallback(async () => {
    if (isExporting || !usersData) return;
    
    setIsExporting(true);
    
    try {
      const entries = await fetchAllEntries();
      const csvContent = generateCSV(entries);
      
      // Generate filename with current date
      const now = new Date();
      const dateString = format(now, 'yyyy-MM-dd_HH-mm');
      const filename = `time-entries_${dateString}.csv`;
      
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error message to user
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, usersData, fetchAllEntries, generateCSV, downloadCSV]);

  // Timer control functions - simplified for play only
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Listen for timer stopped events to refresh list
  useEffect(() => {
    const handleTimerStopped = () => {
      console.log('Timer stopped event received, refreshing entries...');
      // Use the current API URL to ensure the cache is invalidated
      mutate(currentApiUrl);
      // Also refresh the active timer data
      mutate('/api/time-entries/active');
    };

    window.addEventListener('timerStopped', handleTimerStopped);
    return () => window.removeEventListener('timerStopped', handleTimerStopped);
  }, [currentApiUrl]);

  const handleStartTimer = useCallback(async (projectId: string, description: string) => {
    setActionLoading(`start-${projectId}`);
    
    try {
      // First stop any active timer if exists
      if (activeEntry && activeEntry.isActive) {
        await fetch('/api/time-entries/active', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'stop' }),
        });
      }

      // Then start the new timer
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start timer');
      }

      // Refresh both active timer and the current entries list
      await mutate('/api/time-entries/active');
      await mutate(currentApiUrl);
      
    } catch (error) {
      console.error('Error starting timer:', error);
    } finally {
      setActionLoading(null);
    }
  }, [activeEntry, currentApiUrl]);

  if (entriesError || projectsError || usersError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading time entries
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeEntriesData || !projectsData || !usersData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare user options for multi-select
  const userOptions: Option[] = [
    { label: 'All users', value: 'all' },
    ...usersData.map(user => ({
      label: `${user.name} (${user.entryCount} entries)`,
      value: user.id
    }))
  ];

  // Prepare project options for multi-select
  const projectOptions: Option[] = [
    { label: 'All projects', value: 'all' },
    ...projectsData.map(project => ({
      label: `${project.name} (${project.clientName})`,
      value: project.name
    }))
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-3 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {mode === 'dashboard' ? 'Recent Time Entries' : 'Time Entries'}
            <Badge variant="secondary" className="ml-2">
              {mode === 'dashboard' ? `${displayEntries.length} recent` : `${timeEntriesData?.total || 0} entries`}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {mode === 'dashboard' ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.href = '/reports'}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                View All Reports
                <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 px-3 md:px-6">
        {/* Filters - only show in full mode */}
        {mode === 'full' && (
          <div className="space-y-3">
            {/* First Row: Search + Filters Toggle */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entries, projects, or clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11"
                />
              </div>

              {/* Filters Toggle and Clear Row */}
              <div className="flex gap-2 items-center">
                {/* Filters Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-11 px-3 flex-1 sm:flex-none"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {showFilters ? 
                    <ChevronUp className="h-4 w-4 ml-2" /> : 
                    <ChevronDown className="h-4 w-4 ml-2" />
                  }
                </Button>

                {/* Clear Filters */}
                {(searchTerm || selectedProjects.length > 0 || selectedUsers.length > 0 || dateRange.from || dateRange.to) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-11 px-3">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Second Row: Collapsible Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* User Filter */}
                <MultiSelect
                  options={userOptions}
                  selected={selectedUsers}
                  onChange={setSelectedUsers}
                  placeholder="Current user only"
                  searchPlaceholder="Search users..."
                  noResultsText="No users found."
                  className="w-full min-h-11"
                />

                {/* Project Filter */}
                <MultiSelect
                  options={projectOptions}
                  selected={selectedProjects}
                  onChange={setSelectedProjects}
                  placeholder="All projects"
                  searchPlaceholder="Search projects..."
                  noResultsText="No projects found."
                  className="w-full min-h-11"
                />

                {/* Date Range */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-11 justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {dateRange.from && dateRange.to
                        ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                        : 'Date range'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange(range || {})}
                      numberOfMonths={isMobile ? 1 : 2}
                    />
                  </PopoverContent>
                </Popover>

                {/* Sort */}
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder];
                  setSortBy(field);
                  setSortOrder(order);
                }}>
                  <SelectTrigger className="w-full min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Latest first</SelectItem>
                    <SelectItem value="date-asc">Oldest first</SelectItem>
                    <SelectItem value="duration-desc">Longest first</SelectItem>
                    <SelectItem value="duration-asc">Shortest first</SelectItem>
                    <SelectItem value="project-asc">Project A-Z</SelectItem>
                    <SelectItem value="project-desc">Project Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Entries List */}
        <div className="space-y-3">
          {displayEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {mode === 'dashboard' ? 'No recent time entries found' : 'No time entries match your filters'}
            </div>
          ) : (
            displayEntries.map((entry) => (
              <div key={entry.id} className="p-3 md:p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      userId={entry.userId}
                      userName={getUserDisplayName(entry.userId, usersData)}
                      userImage={getUserImage(entry.userId, usersData)}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{entry.projectName}</h4>
                        {(selectedUsers.includes('all') || selectedUsers.length > 1) && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {getUserDisplayName(entry.userId, usersData)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{entry.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(entry.startTime), 'MMM dd, yyyy • HH:mm')}</span>
                        {entry.endTime && (
                          <span>to {format(new Date(entry.endTime), 'HH:mm')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-mono font-medium text-lg">
                      {formatDuration(entry.durationMinutes || 0)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 px-4 bg-green-50 border-green-200 hover:bg-green-100 md:h-8 md:px-2"
                      onClick={() => handleStartTimer(entry.projectId, entry.description)}
                      disabled={actionLoading === `start-${entry.projectId}`}
                    >
                      {actionLoading === `start-${entry.projectId}` ? (
                        <Loader2 className="h-4 w-4 animate-spin text-green-600 md:h-3 md:w-3" />
                      ) : (
                        <Play className="h-4 w-4 text-green-600 md:h-3 md:w-3" />
                      )}
                      <span className="ml-2 md:hidden">Start</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination - only show in full mode */}
        {mode === 'full' && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}>
                <SelectTrigger className="w-20 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-11 px-4 md:h-auto md:px-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2 md:hidden">Previous</span>
              </Button>
              
              <span className="text-sm text-muted-foreground px-4">
                Page {page} of {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-11 px-4 md:h-auto md:px-2"
              >
                <span className="mr-2 md:hidden">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}