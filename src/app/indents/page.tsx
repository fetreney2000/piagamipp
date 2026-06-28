'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Button, Table, Badge, Modal, Select, NumberInput, Group, Title, ActionIcon, Text, Switch, SimpleGrid,
} from '@mantine/core';
import { DatePickerInput, MonthPickerInput, TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { getMYTCurrentDateTime, createUTCDate } from '@/lib/timezone';

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
  const [filterWard, setFilterWard] = useState<string | null>(null);
  const [filterPolicy, setFilterPolicy] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
    const params = new URLSearchParams();
    if (filterWard) params.set('ward', filterWard);
    if (filterPolicy) params.set('policy', filterPolicy);
    if (filterDate) {
      const y = filterDate.getFullYear();
      const m = filterDate.getMonth() + 1;
      params.set('month', String(m));
      params.set('year', String(y));
    }
    const qs = params.toString();
    const res = await fetch(`/api/indents${qs ? `?${qs}` : ''}`);
    const data = await res.json();
    setIndents(data);
  }, [filterWard, filterPolicy, filterDate]);

  const fetchWards = useCallback(async () => {
    const res = await fetch('/api/wards');
    const data = await res.json();
    setWards(data);
  }, []);

  useEffect(() => {
    fetchIndents();
    fetchWards();
  }, [fetchIndents, fetchWards]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchIndents();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchIndents]);

  const handleToggleCountercheck = async (indent: Indent, checked: boolean) => {
    setTogglingId(indent._id);
    const res = await fetch(`/api/indents/${indent._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counterchecked: checked }),
    });
    setTogglingId(null);
    if (res.ok) {
      showNotification({ title: 'Success', message: checked ? 'Indent counterchecked' : 'Countercheck undone', color: 'green' });
      fetchIndents();
    } else {
      showNotification({ title: 'Error', message: 'Failed to update countercheck status', color: 'red' });
    }
  };

  const openAddModal = () => {
    setEditing(null);
    form.reset();
    const { date, time } = getMYTCurrentDateTime();
    const [y, m, d] = date.split('-').map(Number);
    form.setValues({
      dateReceived: createUTCDate(y, m, d),
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
        payload.dateCompleted = createUTCDate(y, m, d).toISOString();
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
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-GB');
  };

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Indents</Title>
        <Button onClick={openAddModal}>Add New Indent</Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="md">
        <MonthPickerInput
          placeholder="Filter by month"
          value={filterDate}
          onChange={(v) => setFilterDate(v as Date | null)}
          clearable
        />
        <Select
          placeholder="Filter by ward"
          data={wards.map((w) => ({ value: w.name, label: w.name }))}
          value={filterWard}
          onChange={setFilterWard}
          clearable
          searchable
        />
        <Select
          placeholder="Filter by policy"
          data={[
            { value: 'achieved', label: 'Policy Achieved' },
            { value: 'exceeded', label: 'Policy Exceeded' },
            { value: 'pending', label: 'Pending' },
          ]}
          value={filterPolicy}
          onChange={setFilterPolicy}
          clearable
        />
      </SimpleGrid>

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
            <Table.Th>Policy Achieved</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {indents.map((indent) => {
            const exceeded = indent.totalTimeMinutes !== null && indent.totalTimeMinutes > 120;
            const achieved = indent.totalTimeMinutes !== null && indent.totalTimeMinutes <= 120;
            return (
              <Table.Tr key={indent._id} style={{ cursor: 'pointer' }}>
                <Table.Td onClick={() => openEditModal(indent)}>{formatDate(indent.dateReceived)}</Table.Td>
                <Table.Td onClick={() => openEditModal(indent)}>{indent.timeReceived}</Table.Td>
                <Table.Td onClick={() => openEditModal(indent)}>{typeLabels[indent.type] || indent.type}</Table.Td>
                <Table.Td onClick={() => openEditModal(indent)}>{indent.wardName}</Table.Td>
                <Table.Td onClick={() => openEditModal(indent)}>{indent.numberOfRx}</Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={indent.counterchecked}
                    onChange={(e) => handleToggleCountercheck(indent, e.currentTarget.checked)}
                    disabled={togglingId === indent._id}
                    aria-label="Toggle counterchecked"
                  />
                </Table.Td>
                <Table.Td onClick={() => openEditModal(indent)}>{formatDate(indent.dateCompleted)}</Table.Td>
                <Table.Td onClick={() => openEditModal(indent)}>{indent.timeCompleted || '\u2014'}</Table.Td>
                <Table.Td onClick={() => openEditModal(indent)}>
                  {indent.totalTimeMinutes !== null ? (
                    <Text c={exceeded ? 'red' : undefined} fw={exceeded ? 700 : undefined}>
                      {indent.totalTimeMinutes}
                    </Text>
                  ) : '\u2014'}
                </Table.Td>
                <Table.Td onClick={() => openEditModal(indent)}>
                  {indent.totalTimeMinutes !== null ? (
                    <Badge color={achieved ? 'green' : 'red'}>
                      {achieved ? 'Achieved' : 'Exceeded'}
                    </Badge>
                  ) : (
                    '\u2014'
                  )}
                </Table.Td>
                <Table.Td>
                  <ActionIcon color="red" onClick={() => handleDelete(indent)} variant="subtle" aria-label="Delete">
                    {'\u2715'}
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            );
          })}
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
            <Switch
              label="Counterchecked"
              checked={form.values.counterchecked}
              onChange={(e) => form.setFieldValue('counterchecked', e.currentTarget.checked)}
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
