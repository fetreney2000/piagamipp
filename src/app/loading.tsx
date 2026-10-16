import { Center, Group, Loader, Text } from '@mantine/core';

export default function Loading() {
  return (
    <Center h="60vh">
      <Group gap="xs">
        <Loader size="sm" />
        <Text c="dimmed">Loading…</Text>
      </Group>
    </Center>
  );
}
