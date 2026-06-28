'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, Text, SimpleGrid, Group, Title, Center } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { getMYTCurrentDateTime } from '@/lib/timezone';

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
        <Title order={2}>Dashboard</Title>
        <MonthPickerInput
          value={date}
          onChange={(v) => setDate(v as Date | null)}
          placeholder="Select month"
        />
      </Group>

      {stats ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          <Card shadow="sm" padding="lg" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Indents</Text>
            <Text size="xxxl" fw={700}>{stats.totalIndents}</Text>
          </Card>
          <Card shadow="sm" padding="lg" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Indents {"<="} 2 Hours</Text>
            <Text size="xxxl" fw={700} c="green">{stats.under120}</Text>
          </Card>
          <Card shadow="sm" padding="lg" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Indents {'>'} 2 Hours</Text>
            <Text size="xxxl" fw={700} c="red">{stats.over120}</Text>
          </Card>
          <Card shadow="sm" padding="lg" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Compliance Rate</Text>
            <Text size="xxxl" fw={700} c={complianceColor}>{stats.complianceRate.toFixed(1)}%</Text>
          </Card>
          <Card shadow="sm" padding="lg" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Average Time (min)</Text>
            <Text size="xxxl" fw={700}>{stats.averageTime.toFixed(1)}</Text>
          </Card>
          <Card shadow="sm" padding="lg" withBorder>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Median Time (min)</Text>
            <Text size="xxxl" fw={700}>{stats.medianTime.toFixed(1)}</Text>
          </Card>
        </SimpleGrid>
      ) : (
        <Center h={200}>
          <Text c="dimmed">Loading stats...</Text>
        </Center>
      )}
    </>
  );
}
