'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

interface DailyReport {
  day: string;
  minutes: number;
}

interface ProjectReport {
  projectName: string;
  minutes: number;
}

interface MonthlyReport {
  month: string;
  minutes: number;
}

interface DashboardChartsProps {
  daily: DailyReport[];
  byProject: ProjectReport[];
  monthly: MonthlyReport[];
}

const areaChartConfig = {
  hours: {
    label: 'Hours',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const barChartConfig = {
  hours: {
    label: 'Hours',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const pieChartConfig = {
  hours: {
    label: 'Hours',
  },
} satisfies ChartConfig;

export default function DashboardCharts({ daily, byProject, monthly }: DashboardChartsProps) {
  // Prepare chart data
  const areaData = daily.map((d) => ({
    date: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hours: +(d.minutes / 60).toFixed(1),
  }));

  const pieData = byProject.map((p, index) => ({
    name: p.projectName,
    value: +(p.minutes / 60).toFixed(1),
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));

  const barData = monthly.map((m) => ({
    month: new Date(m.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    hours: +(m.minutes / 60).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      {/* Daily Hours Area Chart */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Daily Hours (Last 14 Days)</CardTitle>
          <CardDescription>Track your daily work patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={areaChartConfig}>
            <AreaChart
              accessibilityLayer
              data={areaData}
              margin={{
                left: 12,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <defs>
                <linearGradient id="fillHours" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-hours)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-hours)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}h`}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                dataKey="hours"
                type="natural"
                fill="url(#fillHours)"
                fillOpacity={0.4}
                stroke="var(--color-hours)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Project Hours Pie Chart */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Hours by Project (Current Month)</CardTitle>
          <CardDescription>Distribution of time across projects</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={pieChartConfig}
            className="mx-auto aspect-square max-h-[300px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="text-sm text-muted-foreground truncate">
                  {entry.name}: {entry.value}h
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Hours Bar Chart */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Monthly Billed Hours</CardTitle>
          <CardDescription>Revenue trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barChartConfig}>
            <BarChart accessibilityLayer data={barData}>
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}h`}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}