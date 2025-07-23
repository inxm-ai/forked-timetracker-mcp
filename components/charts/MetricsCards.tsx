'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface DailyReport {
  day: string;
  minutes: number;
}

interface ProjectReport {
  projectName: string;
  minutes: number;
}

interface MetricsCardsProps {
  daily: DailyReport[];
  byProject: ProjectReport[];
  totalHours: number;
  activeProjects: number;
}

export default function MetricsCards({ daily, byProject, totalHours, activeProjects }: MetricsCardsProps) {
  // Calculate metrics
  const totalDailyHours = daily.reduce((sum, d) => sum + d.minutes, 0) / 60;
  const avgDailyHours = daily.length > 0 ? totalDailyHours / daily.length : 0;
  const topProject = byProject.reduce((max, p) => p.minutes > max.minutes ? p : max, { projectName: 'None', minutes: 0 });
  
  // Calculate trend (last 3 days vs previous 3 days)
  const recentDays = daily.slice(-3);
  const previousDays = daily.slice(-6, -3);
  const recentAvg = recentDays.reduce((sum, d) => sum + d.minutes, 0) / (recentDays.length || 1) / 60;
  const previousAvg = previousDays.reduce((sum, d) => sum + d.minutes, 0) / (previousDays.length || 1) / 60;
  const trendPercentage = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
  
  const metrics = [
    {
      title: 'Total Hours (Month)',
      value: totalHours.toFixed(1),
      unit: 'hours',
      icon: Clock,
      description: 'Current month total',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Daily Average (14d)',
      value: avgDailyHours.toFixed(1),
      unit: 'hours',
      icon: TrendingUp,
      description: `${trendPercentage >= 0 ? '+' : ''}${trendPercentage.toFixed(1)}% vs last 3 days`,
      color: trendPercentage >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: trendPercentage >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      title: 'Active Projects',
      value: activeProjects.toString(),
      unit: 'projects',
      icon: Calendar,
      description: 'This month',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Top Project',
      value: (topProject.minutes / 60).toFixed(1),
      unit: 'hours',
      icon: DollarSign,
      description: topProject.projectName,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">
                  {metric.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  {metric.unit}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}