import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const ORDERED_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const chartConfig = {
  count: { label: 'Passages', color: 'hsl(var(--primary))' },
};

/** Get Monday of the current week, then apply weekOffset */
const getMondayForOffset = (weekOffset: number): Date => {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  monday.setDate(monday.getDate() + weekOffset * 7);
  return monday;
};

/** Fetch daily breakdown for a given week offset */
const getWeeklyDailyBreakdown = async (userId: string, weekOffset: number) => {
  const monday = getMondayForOffset(weekOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from('user_progress')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', monday.toISOString())
    .lte('completed_at', sunday.toISOString());

  const counts: Record<string, number> = { Lun: 0, Mar: 0, Mer: 0, Jeu: 0, Ven: 0, Sam: 0, Dim: 0 };
  (data || []).forEach((row) => {
    if (!row.completed_at) return;
    const label = DAY_LABELS[new Date(row.completed_at).getDay()];
    if (label in counts) counts[label]++;
  });

  return ORDERED_DAYS.map((day) => ({ day, count: counts[day] }));
};

/** Fetch monthly breakdown grouped by week for a given monthOffset */
const getMonthlyWeeklyBreakdown = async (userId: string, monthOffset: number) => {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

  const { data } = await supabase
    .from('user_progress')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', startOfMonth.toISOString())
    .lte('completed_at', endOfMonth.toISOString());

  // Determine number of weeks in the month
  const daysInMonth = endOfMonth.getDate();
  const numWeeks = Math.ceil(daysInMonth / 7);
  const weeks: { week: string; count: number }[] = [];
  for (let i = 0; i < numWeeks; i++) {
    weeks.push({ week: `Sem ${i + 1}`, count: 0 });
  }

  (data || []).forEach((row) => {
    if (!row.completed_at) return;
    const dayOfMonth = new Date(row.completed_at).getDate();
    const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), numWeeks - 1);
    weeks[weekIndex].count++;
  });

  return weeks;
};

/** Min weekOffset = first Monday of current month */
const getMinWeekOffset = (): number => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dow = firstOfMonth.getDay();
  const firstMonday = new Date(firstOfMonth);
  firstMonday.setDate(firstOfMonth.getDate() + (dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow));

  const currentMonday = getMondayForOffset(0);
  const diff = Math.round((currentMonday.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return -diff;
};

/** Format week label */
const getWeekLabel = (weekOffset: number): string => {
  const monday = getMondayForOffset(weekOffset);
  const monthName = MONTH_NAMES[monday.getMonth()];
  const weekOfMonth = Math.ceil(monday.getDate() / 7);
  return `Sem. ${weekOfMonth} ${monthName} ${monday.getFullYear()}`;
};

/** Format month label */
const getMonthLabel = (monthOffset: number): string => {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  return `${MONTH_NAMES[target.getMonth()]} ${target.getFullYear()}`;
};

interface ActivityChartProps {
  userId: string;
}

const ActivityChart: React.FC<ActivityChartProps> = ({ userId }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const minWeekOffset = useMemo(() => getMinWeekOffset(), []);

  const { data: weeklyBreakdown = [] } = useQuery({
    queryKey: ['weeklyBreakdown', userId, weekOffset],
    queryFn: () => getWeeklyDailyBreakdown(userId, weekOffset),
    staleTime: 5 * 60 * 1000,
  });

  const { data: monthlyBreakdown = [] } = useQuery({
    queryKey: ['monthlyBreakdown', userId, monthOffset],
    queryFn: () => getMonthlyWeeklyBreakdown(userId, monthOffset),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-primary bg-primary/5 py-2 rounded-md text-center mb-4 uppercase tracking-wide">
          Activité
        </h2>

        <Tabs defaultValue="week" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="week" className="flex-1 text-xs">Semaine</TabsTrigger>
            <TabsTrigger value="month" className="flex-1 text-xs">Mois</TabsTrigger>
          </TabsList>

          {/* Weekly view */}
          <TabsContent value="week">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={weekOffset <= minWeekOffset}
                onClick={() => setWeekOffset((o) => o - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-muted-foreground">{getWeekLabel(weekOffset)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={weekOffset >= 0}
                onClick={() => setWeekOffset((o) => o + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <ChartContainer config={chartConfig} className="h-40 w-full">
              <BarChart data={weeklyBreakdown} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" maxBarSize={40} />
              </BarChart>
            </ChartContainer>
          </TabsContent>

          {/* Monthly view */}
          <TabsContent value="month">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={monthOffset <= -6}
                onClick={() => setMonthOffset((o) => o - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-muted-foreground">{getMonthLabel(monthOffset)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={monthOffset >= 0}
                onClick={() => setMonthOffset((o) => o + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <ChartContainer config={chartConfig} className="h-40 w-full">
              <BarChart data={monthlyBreakdown} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" maxBarSize={40} />
              </BarChart>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ActivityChart;
