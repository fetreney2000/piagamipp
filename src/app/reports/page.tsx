'use client';

import { useEffect, useState, useCallback } from 'react';
import { Tabs, Card, Text, SimpleGrid, Title, Group, Center, Paper } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { MonthPickerInput } from '@mantine/dates';
import { getMYTCurrentDateTime } from '@/lib/timezone';
import {
  IconReportAnalytics, IconCalendarMonth, IconCategory, IconClock, IconMoonStars, IconPhoneCall,
  IconFileDescription, IconClockCheck, IconClockExclamation, IconPercentage, IconClockHour4,
  IconChartInfographic, IconChartBar, IconBuildingHospital, IconChartHistogram,
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

interface WardStats {
  wardName: string;
  totalIndents: number;
  completedIndents: number;
  under120: number;
  over120: number;
  complianceRate: number;
  averageTime: number;
  medianTime: number;
}

interface DistributionItem {
  range: string;
  count: number;
}

const groups = [
  { value: 'all', label: 'All Categories', type: null, icon: IconCategory },
  { value: 'office_hour', label: 'Office Hour', type: 'office_hour', icon: IconClock },
  { value: 'ipp_shift', label: 'IPP Shift', type: 'ipp_shift', icon: IconMoonStars },
  { value: 'on_call', label: 'On Call', type: 'on_call', icon: IconPhoneCall },
];

function toDateOrNull(v: Date | string | null): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  return new Date(v + 'T00:00:00.000Z');
}

export default function ReportsPage() {
  const [statsMap, setStatsMap] = useState<Record<string, GroupStats>>({});
  const [wardData, setWardData] = useState<WardStats[]>([]);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [date, setDate] = useState<Date | null>(() => {
    const { date } = getMYTCurrentDateTime();
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d);
  });
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const [statsResults, wardData, distData] = await Promise.all([
      Promise.all(
        groups.map((group) => {
          let url = `/api/indents/stats?month=${month}&year=${year}`;
          if (group.type) url += `&type=${group.type}`;
          return fetch(url).then((r) => r.json());
        })
      ),
      fetch(`/api/indents/per-ward?month=${month}&year=${year}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/indents/distribution?month=${month}&year=${year}`).then((r) => r.ok ? r.json() : []),
    ]);

    const results: Record<string, GroupStats> = {};
    groups.forEach((g, i) => { results[g.value] = statsResults[i]; });
    setStatsMap(results);
    setWardData(wardData);
    setDistribution(distData);

    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const chartData = groups.map((g) => ({
    group: g.label,
    'Within 2 Hours': statsMap[g.value]?.under120 || 0,
    'Exceeding 2 Hours': statsMap[g.value]?.over120 || 0,
  }));

  const wardChartData = [...wardData]
    .sort((a, b) => a.complianceRate - b.complianceRate)
    .map((w) => ({
      ward: w.wardName,
      'Compliance Rate': w.complianceRate,
    }));

  const renderStats = (stats: GroupStats | undefined) => {
    if (!stats) return null;
    const complianceColor = stats.complianceRate >= 80 ? 'green' : 'red';
    return (
      <SimpleGrid cols={{ base: 2, md: 3 }} mb="lg">
        <Card withBorder padding="sm">
          <Group gap="xs" mb="3xs">
            <IconFileDescription size={16} />
            <Text size="xs" c="dimmed">Total Indents</Text>
          </Group>
          <Text fw={700} size="xl">{stats.totalIndents}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb="3xs">
            <IconClockCheck size={16} />
            <Text size="xs" c="dimmed">Within 2 Hours</Text>
          </Group>
          <Text fw={700} size="xl" c="green">{stats.under120}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb="3xs">
            <IconClockExclamation size={16} />
            <Text size="xs" c="dimmed">Exceeding 2 Hours</Text>
          </Group>
          <Text fw={700} size="xl" c="red">{stats.over120}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb="3xs">
            <IconPercentage size={16} />
            <Text size="xs" c="dimmed">Compliance Rate</Text>
          </Group>
          <Text fw={700} size="xl" c={complianceColor}>{stats.complianceRate.toFixed(1)}%</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb="3xs">
            <IconClockHour4 size={16} />
            <Text size="xs" c="dimmed">Average Time (min)</Text>
          </Group>
          <Text fw={700} size="xl">{stats.averageTime.toFixed(1)}</Text>
        </Card>
        <Card withBorder padding="sm">
          <Group gap="xs" mb="3xs">
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
        <MonthPickerInput value={date} onChange={(v) => setDate(toDateOrNull(v))} placeholder="Select month" leftSection={<IconCalendarMonth size={16} />} />
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
            <Title order={3}>Comparison by Category</Title>
          </Group>
          <BarChart
            h={300}
            data={chartData}
            dataKey="group"
            series={[
              { name: 'Within 2 Hours', color: 'green' },
              { name: 'Exceeding 2 Hours', color: 'red' },
            ]}
            tickLine="y"
          />

          {wardChartData.length > 0 && (
            <>
              <Group gap="xs" mt="xl" mb="md">
                <IconBuildingHospital size={24} />
                <Title order={3}>Compliance by Ward</Title>
              </Group>
              <Paper withBorder p="md" radius="md">
                <BarChart
                  h={Math.max(200, wardChartData.length * 50)}
                  data={wardChartData}
                  dataKey="ward"
                  series={[
                    { name: 'Compliance Rate', color: 'blue.6' },
                  ]}
                  tickLine="y"
                  valueFormatter={(v) => `${v}%`}
                  withBarValueLabel
                />
              </Paper>
            </>
          )}

          {distribution.length > 0 && (
            <>
              <Group gap="xs" mt="xl" mb="md">
                <IconChartHistogram size={24} />
                <Title order={3}>Completion Time Distribution</Title>
              </Group>
              <Paper withBorder p="md" radius="md">
                <BarChart
                  h={300}
                  data={distribution}
                  dataKey="range"
                  series={[
                    { name: 'count', label: 'Indents', color: 'violet.6' },
                  ]}
                  tickLine="y"
                  withBarValueLabel
                />
              </Paper>
            </>
          )}
        </>
      )}
    </>
  );
}
