import { Title, Text, Paper, Stack, Avatar, Group, Divider, ThemeIcon } from '@mantine/core';
import { IconClipboardCheck, IconMail, IconPhone, IconUser } from '@tabler/icons-react';

export default function AboutPage() {
  return (
    <>
      <Title order={2} mb="lg">About</Title>
      <Paper withBorder p="xl" maw={520} radius="md">
        <Stack gap="lg" align="center">
          <Avatar size={100} radius={100} color="blue">
            <IconClipboardCheck size={48} />
          </Avatar>
          <Text fw={700} size="xl">PiagamIPP</Text>
          <Text c="dimmed" size="sm" ta="center">
            Medication Filling Order Waiting Time Tracker
          </Text>
          <Divider w="100%" />
          <Group gap="sm" wrap="nowrap" w="100%">
            <ThemeIcon variant="light" color="blue" size="lg">
              <IconUser size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">Developer</Text>
              <Text fw={600}>Ahmad Fetre Bin Mohammad Zime</Text>
            </div>
          </Group>
          <Group gap="sm" wrap="nowrap" w="100%">
            <ThemeIcon variant="light" color="blue" size="lg">
              <IconMail size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">Email</Text>
              <Text fw={600}>fetreney2000@gmail.com</Text>
            </div>
          </Group>
          <Group gap="sm" wrap="nowrap" w="100%">
            <ThemeIcon variant="light" color="blue" size="lg">
              <IconPhone size={20} />
            </ThemeIcon>
            <div>
              <Text size="xs" c="dimmed">Phone</Text>
              <Text fw={600}>016-881 3920</Text>
            </div>
          </Group>
        </Stack>
      </Paper>
    </>
  );
}
