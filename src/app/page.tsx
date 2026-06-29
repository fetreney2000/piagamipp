'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Text, SimpleGrid, Group, Title, Center, Paper } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { LineChart } from '@mantine/charts';
import { getMYTCurrentDateTime } from '@/lib/timezone';
import {
  IconDashboard, IconFileDescription, IconClockCheck, IconClockExclamation,
  IconPercentage, IconClockHour4, IconChartInfographic, IconCalendarMonth,
  IconHourglass, IconChartLine,
} from '@tabler/icons-react';

interface Stats {
  totalIndents: number;
  completedIndents: number;
  pendingIndents: number;
  under120: number;
  over120: number;
  complianceRate: number;
  averageTime: number;
  medianTime: number;
}

interface TrendItem {
  month: number;
  year: number;
  complianceRate: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDateOrNull(v: Date | string | null): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  return new Date(v + 'T00:00:00.000Z');
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [date, setDate] = useState<Date | null>(() => {
    const { date } = getMYTCurrentDateTime();
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  const fetchStats = useCallback(async () => {
    if (!date) return;
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const res = await fetch(`/api/indents/stats?month=${month}&year=${year}`);
    const data = await res.json();
    setStats(data);
  }, [date]);

  const fetchTrends = useCallback(async () => {
    const res = await fetch('/api/indents/trends?months=12');
    const data = await res.json();
    setTrends(data);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchTrends();
  }, [fetchStats, fetchTrends]);

  const complianceColor = stats && stats.complianceRate >= 80 ? 'green' : 'red';

  const trendChartData = trends.map((t) => ({
    label: `${MONTH_NAMES[t.month - 1]} '${String(t.year).slice(2)}`,
    'Compliance Rate': t.complianceRate,
  }));

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <IconDashboard size={28} />
          <Title order={2}>Dashboard</Title>
        </Group>
        <MonthPickerInput
          value={date}
          onChange={(v) => setDate(toDateOrNull(v))}
          placeholder="Select month"
          leftSection={<IconCalendarMonth size={16} />}
        />
      </Group>

      {stats ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            <Card shadow="sm" padding="lg" withBorder>
              <Group gap="xs" mb="xs">
                <IconFileDescription size={20} />
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Indents</Text>
              </Group>
              <Text size="xxxl" fw={700}>{stats.totalIndents}</Text>
            </Card>
            <Card shadow="sm" padding="lg" withBorder>
              <Group gap="xs" mb="xs">
                <IconClockCheck size={20} />
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Within 2 Hours</Text>
              </Group>
              <Text size="xxxl" fw={700} c="green">{stats.under120}</Text>
            </Card>
            <Card shadow="sm" padding="lg" withBorder>
              <Group gap="xs" mb="xs">
                <IconClockExclamation size={20} />
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Exceeding 2 Hours</Text>
              </Group>
              <Text size="xxxl" fw={700} c="red">{stats.over120}</Text>
            </Card>
            <Card shadow="sm" padding="lg" withBorder>
              <Group gap="xs" mb="xs">
                <IconPercentage size={20} />
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Compliance Rate</Text>
              </Group>
              <Text size="xxxl" fw={700} c={complianceColor}>{stats.complianceRate.toFixed(1)}%</Text>
            </Card>
            <Card shadow="sm" padding="lg" withBorder>
              <Group gap="xs" mb="xs">
                <IconClockHour4 size={20} />
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Average Time (min)</Text>
              </Group>
              <Text size="xxxl" fw={700}>{stats.averageTime.toFixed(1)}</Text>
            </Card>
            <Card shadow="sm" padding="lg" withBorder>
              <Group gap="xs" mb="xs">
                <IconChartInfographic size={20} />
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Median Time (min)</Text>
              </Group>
              <Text size="xxxl" fw={700}>{stats.medianTime.toFixed(1)}</Text>
            </Card>
            <Card shadow="sm" padding="lg" withBorder>
              <Group gap="xs" mb="xs">
                <IconHourglass size={20} />
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Pending Indents</Text>
              </Group>
              <Text size="xxxl" fw={700} c="orange">{stats.pendingIndents}</Text>
            </Card>
          </SimpleGrid>

          <Paper withBorder p="md" radius="md" mt="xl">
            <Group gap="xs" mb="md">
              <IconChartLine size={22} />
              <Title order={3}>Compliance Trend (Last 12 Months)</Title>
            </Group>
            <LineChart
              h={300}
              data={trendChartData}
              dataKey="label"
              series={[{ name: 'Compliance Rate', color: 'blue.6' }]}
              tickLine="y"
              withLegend
              valueFormatter={(v) => `${v}%`}
            />
          </Paper>
        </>
      ) : (
        <Center h={200}>
          <Group gap="xs">
            <IconClockHour4 size={20} />
            <Text c="dimmed">Loading stats...</Text>
          </Group>
        </Center>
      )}
    </>
  );
}
