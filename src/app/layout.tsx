'use client';

import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/notifications/styles.css';

import { MantineProvider, AppShell, Group, Title, ActionIcon, Text, NavLink } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Indents', href: '/indents' },
  { label: 'Reports', href: '/reports' },
  { label: 'Wards', href: '/wards' },
  { label: 'About', href: '/about' },
];

function Shell({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();

  return (
    <MantineProvider forceColorScheme="light">
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
                <Title order={4}>PiagamIPP</Title>
              </Group>
              <ActionIcon variant="default" onClick={toggle} size="lg" aria-label="Toggle navigation">
                ☰
              </ActionIcon>
            </Group>
          </AppShell.Header>
          <AppShell.Navbar p="md">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.label}
                active={pathname === item.href}
                variant="light"
              />
            ))}
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
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
