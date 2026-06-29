'use client';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/notifications/styles.css';
import '../../style.css';

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

const navItems = [
  { label: 'Dashboard', href: '/', icon: IconDashboard },
  { label: 'Indents', href: '/indents', icon: IconClipboardList },
  { label: 'Reports', href: '/reports', icon: IconReportAnalytics },
  { label: 'Wards', href: '/wards', icon: IconBuildingHospital },
  { label: 'About', href: '/about', icon: IconInfoCircle },
];

function Shell({ children }: { children: React.ReactNode }) {
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
            {children}
            <Text ta="center" c="dimmed" size="xs" mt="xl" py="md">
              PiagamIPP © {new Date().getFullYear()} — Ahmad Fetre Bin Mohammad Zime
            </Text>
          </AppShell.Main>
        </AppShell>
      </ModalsProvider>
    </MantineProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PiagamIPP</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
