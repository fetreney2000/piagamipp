'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Button, Table, Badge, Modal, Select, NumberInput, Group, Title, ActionIcon, Text,
} from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { getMYTCurrentDateTime } from '@/lib/timezone';

interface Indent {
  _id: string;
  dateReceived: string;
  timeReceived: string;
  type: string;
  wardName: string;
  numberOfRx: number;
  counterchecked: boolean;
  dateCompleted: string | null;
  timeCompleted: string | null;
  totalTimeMinutes: number | null;
}

interface Ward {
  _id: string;
  name: string;
}

const typeLabels: Record<string, string> = {
  office_hour: 'Office Hour',
  ipp_shift: 'IPP Shift',
  on_call: 'On Call',
};

export default function IndentsPage() {
  const [indents, setIndents] = useState<Indent[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<Indent | null>(null);

  const form = useForm({
    initialValues: {
      dateReceived: null as Date | null,
      timeReceived: '',
      type: '',
      wardName: '',
      numberOfRx: 1,
      counterchecked: false,
    },
  });

  const fetchIndents = useCallback(async () => {
    const res = await fetch('/api/indents');
    const data = await res.json();
    setIndents(data);
  }, []);

  const fetchWards = useCallback(async () => {
    const res = await fetch('/api/wards');
    const data = await res.json();
    setWards(data);
  }, []);

  useEffect(() => {
    fetchIndents();
    fetchWards();
  }, [fetchIndents, fetchWards]);

  const openAddModal = () => {
    setEditing(null);
    form.reset();
    const { date, time } = getMYTCurrentDateTime();
    const [y, m, d] = date.split('-').map(Number);
    form.setValues({
      dateReceived: new Date(y, m - 1, d),
      timeReceived: time.slice(0, 5),
    });
    setModalOpened(true);
  };

  const openEditModal = (indent: Indent) => {
    setEditing(indent);
    form.setValues({
      dateReceived: new Date(indent.dateReceived),
      timeReceived: indent.timeReceived,
      type: indent.type,
      wardName: indent.wardName,
      numberOfRx: indent.numberOfRx,
      counterchecked: indent.counterchecked,
    });
    setModalOpened(true);
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (editing) {
      const payload: Record<string, unknown> = {
        dateReceived: values.dateReceived?.toISOString(),
        timeReceived: values.timeReceived,
        type: values.type,
        wardName: values.wardName,
        numberOfRx: values.numberOfRx,
        counterchecked: values.counterchecked,
      };
      if (values.counterchecked && !editing.counterchecked) {
        const { date, time } = getMYTCurrentDateTime();
        const [y, m, d] = date.split('-').map(Number);
        const [hh, mm] = time.split(':').map(Number);
        const mytDate = new Date(y, m - 1, d, hh, mm);
        payload.dateCompleted = mytDate.toISOString();
        payload.timeCompleted = time.slice(0, 5);
      }
      const res = await fetch(`/api/indents/${editing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showNotification({ title: 'Success', message: 'Indent updated', color: 'green' });
        fetchIndents();
        setModalOpened(false);
      } else {
        showNotification({ title: 'Error', message: 'Failed to update indent', color: 'red' });
      }
    } else {
      const res = await fetch('/api/indents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateReceived: values.dateReceived?.toISOString(),
          timeReceived: values.timeReceived,
          type: values.type,
          wardName: values.wardName,
          numberOfRx: values.numberOfRx,
        }),
      });
      if (res.ok) {
        showNotification({ title: 'Success', message: 'Indent created', color: 'green' });
        fetchIndents();
        setModalOpened(false);
      } else {
        showNotification({ title: 'Error', message: 'Failed to create indent', color: 'red' });
      }
    }
  };

  const handleDelete = (indent: Indent) => {
    modals.openConfirmModal({
      title: 'Delete Indent',
      children: <Text>Are you sure you want to delete this indent?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        const res = await fetch(`/api/indents/${indent._id}`, { method: 'DELETE' });
        if (res.ok) {
          showNotification({ title: 'Success', message: 'Indent deleted', color: 'green' });
          fetchIndents();
        } else {
          showNotification({ title: 'Error', message: 'Failed to delete indent', color: 'red' });
        }
      },
    });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB');
  };

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Indents</Title>
        <Button onClick={openAddModal}>Add New Indent</Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date Received</Table.Th>
            <Table.Th>Time Received</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Ward Name</Table.Th>
            <Table.Th>Number of Rx</Table.Th>
            <Table.Th>Counterchecked</Table.Th>
            <Table.Th>Date Completed</Table.Th>
            <Table.Th>Time Completed</Table.Th>
            <Table.Th>Total Time (min)</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {indents.map((indent) => (
            <Table.Tr key={indent._id} style={{ cursor: 'pointer' }}>
              <Table.Td onClick={() => openEditModal(indent)}>{formatDate(indent.dateReceived)}</Table.Td>
              <Table.Td onClick={() => openEditModal(indent)}>{indent.timeReceived}</Table.Td>
              <Table.Td onClick={() => openEditModal(indent)}>{typeLabels[indent.type] || indent.type}</Table.Td>
              <Table.Td onClick={() => openEditModal(indent)}>{indent.wardName}</Table.Td>
              <Table.Td onClick={() => openEditModal(indent)}>{indent.numberOfRx}</Table.Td>
              <Table.Td onClick={() => openEditModal(indent)}>
                <Badge color={indent.counterchecked ? 'green' : 'orange'}>
                  {indent.counterchecked ? 'Yes' : 'No'}
                </Badge>
              </Table.Td>
              <Table.Td onClick={() => openEditModal(indent)}>{formatDate(indent.dateCompleted)}</Table.Td>
              <Table.Td onClick={() => openEditModal(indent)}>{indent.timeCompleted || '—'}</Table.Td>
              <Table.Td onClick={() => openEditModal(indent)}>
                {indent.totalTimeMinutes !== null ? (
                  <Text c={indent.totalTimeMinutes > 120 ? 'red' : undefined} fw={indent.totalTimeMinutes > 120 ? 700 : undefined}>
                    {indent.totalTimeMinutes}
                  </Text>
                ) : '—'}
              </Table.Td>
              <Table.Td>
                <ActionIcon color="red" onClick={() => handleDelete(indent)} variant="subtle" aria-label="Delete">
                  ✕
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editing ? 'Edit Indent' : 'Add New Indent'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <DatePickerInput
            label="Date Received"
            placeholder="Select date"
            {...form.getInputProps('dateReceived')}
            mb="sm"
          />
          <TimeInput
            label="Time Received"
            {...form.getInputProps('timeReceived')}
            mb="sm"
          />
          <Select
            label="Type"
            placeholder="Select type"
            data={[
              { value: 'office_hour', label: 'Office Hour' },
              { value: 'ipp_shift', label: 'IPP Shift' },
              { value: 'on_call', label: 'On Call' },
            ]}
            {...form.getInputProps('type')}
            mb="sm"
          />
          <Select
            label="Ward Name"
            placeholder="Select ward"
            data={wards.map((w) => ({ value: w.name, label: w.name }))}
            {...form.getInputProps('wardName')}
            mb="sm"
            searchable
          />
          <NumberInput
            label="Number of Rx"
            placeholder="Enter number"
            min={1}
            {...form.getInputProps('numberOfRx')}
            mb="sm"
          />
          {editing && (
            <Select
              label="Counterchecked"
              data={[
                { value: 'false', label: 'No' },
                { value: 'true', label: 'Yes' },
              ]}
              value={form.values.counterchecked ? 'true' : 'false'}
              onChange={(v) => form.setFieldValue('counterchecked', v === 'true')}
              mb="sm"
            />
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
