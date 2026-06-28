'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, Card, Text, SimpleGrid, Title, Group, Center } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { MonthPickerInput } from '@mantine/dates';
import { getMYTCurrentDateTime } from '@/lib/timezone';

interface GroupStats {
  totalIndents: number;
  completedIndents: number;
  under120: number;
  over120: number;
  complianceRate: number;
  averageTime: number;
  medianTime: number;
}

const groups = [
  { value: 'all', label: 'All Categories', type: null },
  { value: 'office_hour', label: 'Office Hour', type: 'office_hour' },
  { value: 'ipp_shift', label: 'IPP Shift', type: 'ipp_shift' },
  { value: 'on_call', label: 'On Call', type: 'on_call' },
];

export default function ReportsPage() {
  const [statsMap, setStatsMap] = useState<Record<string, GroupStats>>({});
  const [date, setDate] = useState<Date | null>(() => {
    const { date } = getMYTCurrentDateTime();
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
  });
  const [loading, setLoading] = useState(true);

  const fetchAllStats = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const results: Record<string, GroupStats> = {};

    for (const group of groups) {
      let url = `/api/indents/stats?month=${month}&year=${year}`;
      if (group.type) url += `&type=${group.type}`;
      const res = await fetch(url);
      results[group.value] = await res.json();
    }

    setStatsMap(results);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchAllStats();
  }, [fetchAllStats]);

  const chartData = groups.map((g) => ({
    group: g.label,
    '<= 2 Hours': statsMap[g.value]?.under120 || 0,
    '> 2 Hours': statsMap[g.value]?.over120 || 0,
  }));

  const renderStats = (stats: GroupStats | undefined) => {
    if (!stats) return null;
    const complianceColor = stats.complianceRate >= 80 ? 'green' : 'red';
    return (
      <SimpleGrid cols={{ base: 2, md: 3 }} mb="lg">
        <Card withBorder padding="sm">
          <Text size="xs" c="dimmed">Total Indents</Text>
          <Text fw={700} size="xl">{stats.totalIndents}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Text size="xs" c="dimmed">{"<="} 2 Hours</Text>
          <Text fw={700} size="xl" c="green">{stats.under120}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Text size="xs" c="dimmed">{'>'} 2 Hours</Text>
          <Text fw={700} size="xl" c="red">{stats.over120}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Text size="xs" c="dimmed">Compliance Rate</Text>
          <Text fw={700} size="xl" c={complianceColor}>{stats.complianceRate.toFixed(1)}%</Text>
        </Card>
        <Card withBorder padding="sm">
          <Text size="xs" c="dimmed">Average Time (min)</Text>
          <Text fw={700} size="xl">{stats.averageTime.toFixed(1)}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Text size="xs" c="dimmed">Median Time (min)</Text>
          <Text fw={700} size="xl">{stats.medianTime.toFixed(1)}</Text>
        </Card>
      </SimpleGrid>
    );
  };

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Reports</Title>
        <MonthPickerInput value={date} onChange={(v) => setDate(v as Date | null)} placeholder="Select month" />
      </Group>

      {loading ? (
        <Center h={200}><Text c="dimmed">Loading reports...</Text></Center>
      ) : (
        <>
          <Tabs defaultValue="all">
            <Tabs.List>
              {groups.map((g) => (
                <Tabs.Tab key={g.value} value={g.value}>{g.label}</Tabs.Tab>
              ))}
            </Tabs.List>

            {groups.map((g) => (
              <Tabs.Panel key={g.value} value={g.value} pt="md">
                {renderStats(statsMap[g.value])}
              </Tabs.Panel>
            ))}
          </Tabs>

          <Title order={3} mt="xl" mb="md">Comparison Chart</Title>
          <BarChart
            h={300}
            data={chartData}
            dataKey="group"
            series={[
              { name: '<= 2 Hours', color: 'green' },
              { name: '> 2 Hours', color: 'red' },
            ]}
            tickLine="y"
          />
        </>
      )}
    </>
  );
}
