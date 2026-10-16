'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import { Alert, Button, Center, Group, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Center mih="60vh">
      <Alert
        variant="light"
        color="red"
        icon={<IconAlertCircle size={24} />}
        title={<Title order={3}>Something went wrong</Title>}
        w="100%"
        maw={520}
      >
        <Stack gap="sm">
          <Text size="sm">
            An unexpected error occurred while showing this page. You can try again, or go back
            to the dashboard.
          </Text>
          {error.digest && (
            <Text size="xs" c="dimmed" ff="monospace">
              Error reference: {error.digest}
            </Text>
          )}
          <Group>
            <Button leftSection={<IconRefresh size={16} />} onClick={() => unstable_retry()}>
              Try again
            </Button>
            <Button component={Link} href="/" variant="light">
              Go to dashboard
            </Button>
          </Group>
        </Stack>
      </Alert>
    </Center>
  );
}
