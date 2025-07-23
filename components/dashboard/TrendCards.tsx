'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';
import useSWR from 'swr';

interface DashboardSummary {
  lastActivity: string | null;
  totalHours: string;
  weeklyHours?: string;
  weeklyTrend?: number;
  averageDaily?: string;
  workingDays?: number;
}

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Failed to fetch');
  return r.json();
});

export default function TrendCards() {
  const { data: summary, error } = useSWR<DashboardSummary>('/api/dashboard/summary', fetcher);

  if (error || !summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalHours = parseFloat(summary.totalHours);
  const weeklyHours = parseFloat(summary.weeklyHours || '0');
  const weeklyTrend = summary.weeklyTrend || 0;
  const averageDaily = parseFloat(summary.averageDaily || '0');
  const workingDays = summary.workingDays || 0;

  const trends = [
    {
      title: 'This Month',
      value: totalHours,
      unit: 'hours',
      description: 'Total hours tracked',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'This Week',
      value: weeklyHours,
      unit: 'hours',
      description: weeklyTrend >= 0 ? `+${weeklyTrend.toFixed(1)}% vs last week` : `${weeklyTrend.toFixed(1)}% vs last week`,
      icon: weeklyTrend >= 0 ? TrendingUp : TrendingDown,
      color: weeklyTrend >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: weeklyTrend >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: 'Daily Average',
      value: averageDaily,
      unit: 'hours',
      description: `${workingDays} working days`,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {trends.map((trend, index) => {
        const Icon = trend.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {trend.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${trend.bgColor}`}>
                <Icon className={`h-4 w-4 ${trend.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">
                  {trend.value.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {trend.unit}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {trend.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}