'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, Card, Text, SimpleGrid, Title, Group, Center } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { MonthPickerInput } from '@mantine/dates';
import { getMYTCurrentDateTime } from '@/lib/timezone';
import {
  IconReportAnalytics, IconCalendarMonth, IconCategory, IconClock, IconMoonStars, IconPhoneCall,
  IconFileDescription, IconClockCheck, IconClockExclamation, IconPercentage, IconClockHour4,
  IconChartInfographic, IconChartBar,
} from '@tabler/icons-react';

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
  { value: 'all', label: 'All Categories', type: null, icon: IconCategory },
  { value: 'office_hour', label: 'Office Hour', type: 'office_hour', icon: IconClock },
  { value: 'ipp_shift', label: 'IPP Shift', type: 'ipp_shift', icon: IconMoonStars },
  { value: 'on_call', label: 'On Call', type: 'on_call', icon: IconPhoneCall },
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
          <Group gap="xs" mb={4}>
            <IconFileDescription size={16} />
            <Text size="xs" c="dimmed">Total Indents</Text>
          </Group>
          <Text fw={700} size="xl">{stats.totalIndents}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb={4}>
            <IconClockCheck size={16} />
            <Text size="xs" c="dimmed">{"<="} 2 Hours</Text>
          </Group>
          <Text fw={700} size="xl" c="green">{stats.under120}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb={4}>
            <IconClockExclamation size={16} />
            <Text size="xs" c="dimmed">{'>'} 2 Hours</Text>
          </Group>
          <Text fw={700} size="xl" c="red">{stats.over120}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb={4}>
            <IconPercentage size={16} />
            <Text size="xs" c="dimmed">Compliance Rate</Text>
          </Group>
          <Text fw={700} size="xl" c={complianceColor}>{stats.complianceRate.toFixed(1)}%</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb={4}>
            <IconClockHour4 size={16} />
            <Text size="xs" c="dimmed">Average Time (min)</Text>
          </Group>
          <Text fw={700} size="xl">{stats.averageTime.toFixed(1)}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb={4}>
            <IconChartInfographic size={16} />
            <Text size="xs" c="dimmed">Median Time (min)</Text>
          </Group>
          <Text fw={700} size="xl">{stats.medianTime.toFixed(1)}</Text>
        </Card>
      </SimpleGrid>
    );
  };

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <IconReportAnalytics size={28} />
          <Title order={2}>Reports</Title>
        </Group>
        <MonthPickerInput value={date} onChange={(v) => setDate(v as Date | null)} placeholder="Select month" leftSection={<IconCalendarMonth size={16} />} />
      </Group>

      {loading ? (
        <Center h={200}><Group gap="xs"><IconClockHour4 size={20} /><Text c="dimmed">Loading reports...</Text></Group></Center>
      ) : (
        <>
          <Tabs defaultValue="all">
            <Tabs.List>
              {groups.map((g) => {
                const TabIcon = g.icon;
                return (
                  <Tabs.Tab key={g.value} value={g.value} leftSection={<TabIcon size={16} />}>{g.label}</Tabs.Tab>
                );
              })}
            </Tabs.List>

            {groups.map((g) => (
              <Tabs.Panel key={g.value} value={g.value} pt="md">
                {renderStats(statsMap[g.value])}
              </Tabs.Panel>
            ))}
          </Tabs>

          <Group gap="xs" mt="xl" mb="md">
            <IconChartBar size={24} />
            <Title order={3}>Comparison Chart</Title>
          </Group>
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
