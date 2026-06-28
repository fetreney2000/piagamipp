import { Title, Text, Paper, Stack } from '@mantine/core';

export default function AboutPage() {
  return (
    <>
      <Title order={2} mb="lg">About</Title>
      <Paper withBorder p="xl" maw={500}>
        <Stack gap="md">
          <div>
            <Text size="sm" c="dimmed">App Name</Text>
            <Text fw={700}>PiagamIPP</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">Developer</Text>
            <Text fw={700}>Ahmad Fetre Bin Mohammad Zime</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">Email</Text>
            <Text fw={700}>fetreney2000@gmail.com</Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">Phone</Text>
            <Text fw={700}>016-881 3920</Text>
          </div>
        </Stack>
      </Paper>
    </>
  );
}
