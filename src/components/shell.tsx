'use client';

import { MantineProvider, AppShell, Group, Title, ActionIcon, Text, NavLink } from '@mantine/core';
import { shadcnTheme } from '../../theme';
import { shadcnCssVariableResolver } from '../../cssVariableResolver';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard, IconClipboardList, IconReportAnalytics, IconBuildingHospital, IconInfoCircle,
  IconMenu2, IconClipboardCheck,
} from '@tabler/icons-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LoadingProvider } from '@/lib/loading-context';

const navItems = [
  { label: 'Dashboard', href: '/', icon: IconDashboard },
  { label: 'Indents', href: '/indents', icon: IconClipboardList },
  { label: 'Reports', href: '/reports', icon: IconReportAnalytics },
  { label: 'Wards', href: '/wards', icon: IconBuildingHospital },
  { label: 'About', href: '/about', icon: IconInfoCircle },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();

  return (
    <MantineProvider forceColorScheme="light" theme={shadcnTheme} cssVariablesResolver={shadcnCssVariableResolver}>
      <ModalsProvider>
        <Notifications />
        <AppShell
          header={{ height: 60 }}
          navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
          padding="md"
        >
          <AppShell.Header>
            <Group h="100%" px="md" justify="space-between">
              <Group>
                <IconClipboardCheck size={28} />
                <Title order={4}>PiagamIPP</Title>
              </Group>
              <ActionIcon variant="default" onClick={toggle} size="lg" hiddenFrom="sm" aria-label="Toggle navigation">
                <IconMenu2 />
              </ActionIcon>
            </Group>
          </AppShell.Header>
          <AppShell.Navbar p="md">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  label={item.label}
                  active={pathname === item.href}
                  variant="light"
                  leftSection={<Icon size={20} />}
                />
              );
            })}
          </AppShell.Navbar>
          <AppShell.Main>
            <LoadingProvider>
              {children}
            </LoadingProvider>
            <Text ta="center" c="dimmed" size="xs" mt="xl" py="md">
              PiagamIPP © {new Date().getFullYear()} — Ahmad Fetre Bin Mohammad Zime
            </Text>
          </AppShell.Main>
        </AppShell>
      </ModalsProvider>
    </MantineProvider>
  );
}
