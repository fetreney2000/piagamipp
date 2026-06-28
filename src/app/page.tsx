'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Text, SimpleGrid, Group, Title, Center } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { getMYTCurrentDateTime } from '@/lib/timezone';
import {
  IconDashboard, IconFileDescription, IconClockCheck, IconClockExclamation,
  IconPercentage, IconClockHour4, IconChartInfographic, IconCalendarMonth,
} from '@tabler/icons-react';

interface Stats {
  totalIndents: number;
  completedIndents: number;
  under120: number;
  over120: number;
  complianceRate: number;
  averageTime: number;
  medianTime: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const complianceColor = stats && stats.complianceRate >= 80 ? 'green' : 'red';

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <IconDashboard size={28} />
          <Title order={2}>Dashboard</Title>
        </Group>
        <MonthPickerInput
          value={date}
          onChange={(v) => setDate(v as Date | null)}
          placeholder="Select month"
          leftSection={<IconCalendarMonth size={16} />}
        />
      </Group>

      {stats ? (
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
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Indents {"<="} 2 Hours</Text>
            </Group>
            <Text size="xxxl" fw={700} c="green">{stats.under120}</Text>
          </Card>
          <Card shadow="sm" padding="lg" withBorder>
            <Group gap="xs" mb="xs">
              <IconClockExclamation size={20} />
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Indents {'>'} 2 Hours</Text>
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
        </SimpleGrid>
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
