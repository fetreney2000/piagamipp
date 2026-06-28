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
import { determineIndentType } from '@/lib/indent-type';
import {
  IconClipboardList, IconPlus, IconCalendarSearch, IconBuildingHospital, IconFilterCheck,
  IconCategory, IconClock, IconCalendarEvent, IconPill, IconCheckbox, IconCalendarCheck,
  IconHourglass, IconTarget, IconSettings, IconTrash, IconEdit, IconX, IconDeviceFloppy,
  IconMoonStars, IconPhoneCall, IconCircleCheck, IconAlertCircle,
} from '@tabler/icons-react';

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

function toDateOrNull(v: Date | string | null): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  return new Date(v + 'T00:00:00.000Z');
}

export default function IndentsPage() {
  const [indents, setIndents] = useState<Indent[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<Indent | null>(null);
  const [filterWard, setFilterWard] = useState<string | null>(null);
  const [filterPolicy, setFilterPolicy] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  function getElapsedMinutes(indent: Indent): number | null {
    if (indent.counterchecked) return indent.totalTimeMinutes;
    if (!indent.dateReceived || !indent.timeReceived) return null;
    const [rh, rm] = indent.timeReceived.split(':').map(Number);
    const d = new Date(indent.dateReceived);
    const startUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), rh - 8, rm);
    return Math.floor((Date.now() - startUTC) / 60000);
  }

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
    if (modalOpened) return;
    fetchIndents();
    fetchWards();
  }, [fetchIndents, fetchWards, modalOpened]);

  useEffect(() => {
    if (modalOpened) return;
    const interval = setInterval(() => {
      fetchIndents();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchIndents, modalOpened]);

  useEffect(() => {
    if (editing) return;
    const date = form.values.dateReceived;
    const time = form.values.timeReceived;
    if (!date || !time) return;

    let cancelled = false;
    const dateStr = date.toISOString().slice(0, 10);

    (async () => {
      try {
        const res = await fetch('/api/holidays/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr }),
        });
        const { isPublicHoliday } = await res.json();
        if (!cancelled) {
          const type = determineIndentType(dateStr, time, isPublicHoliday);
          form.setFieldValue('type', type);
        }
      } catch {
        if (!cancelled) {
          const type = determineIndentType(dateStr, time, false);
          form.setFieldValue('type', type);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [editing, form.values.dateReceived, form.values.timeReceived]);

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
        <Group gap="xs">
          <IconClipboardList size={28} />
          <Title order={2}>Indents</Title>
        </Group>
        <Button onClick={openAddModal} leftSection={<IconPlus size={16} />}>Add New Indent</Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="md">
        <MonthPickerInput
          placeholder="Filter by month"
          value={filterDate}
          onChange={(v) => setFilterDate(toDateOrNull(v))}
          clearable
          leftSection={<IconCalendarSearch size={16} />}
        />
        <Select
          placeholder="Filter by ward"
          data={wards.map((w) => ({ value: w.name, label: w.name }))}
          value={filterWard}
          onChange={setFilterWard}
          clearable
          searchable
          leftSection={<IconBuildingHospital size={16} />}
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
          leftSection={<IconFilterCheck size={16} />}
        />
      </SimpleGrid>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th><Group gap={4}><IconCalendarEvent size={14} />Date Received</Group></Table.Th>
            <Table.Th><Group gap={4}><IconClock size={14} />Time Received</Group></Table.Th>
            <Table.Th><Group gap={4}><IconCategory size={14} />Type</Group></Table.Th>
            <Table.Th><Group gap={4}><IconBuildingHospital size={14} />Ward Name</Group></Table.Th>
            <Table.Th><Group gap={4}><IconPill size={14} />Rx</Group></Table.Th>
            <Table.Th><Group gap={4}><IconCheckbox size={14} />Counterchecked</Group></Table.Th>
            <Table.Th><Group gap={4}><IconCalendarCheck size={14} />Date Completed</Group></Table.Th>
            <Table.Th><Group gap={4}><IconClock size={14} />Time Completed</Group></Table.Th>
            <Table.Th><Group gap={4}><IconHourglass size={14} />Total Time</Group></Table.Th>
            <Table.Th><Group gap={4}><IconTarget size={14} />Policy</Group></Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {indents.map((indent) => {
            const elapsed = getElapsedMinutes(indent);
            const exceeded = elapsed !== null && elapsed > 120;
            const achieved = elapsed !== null && elapsed <= 120;
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
                  {elapsed !== null ? (
                    <Text c={exceeded ? 'red' : undefined} fw={exceeded ? 700 : undefined}>
                      {elapsed}
                    </Text>
                  ) : '\u2014'}
                </Table.Td>
                <Table.Td onClick={() => openEditModal(indent)}>
                  {indent.counterchecked ? (
                    <Text c={achieved ? 'green' : 'red'} fw={700} size="xl">
                      {achieved ? '\u2713' : '\u2715'}
                    </Text>
                  ) : (
                    '\u2014'
                  )}
                </Table.Td>
                <Table.Td>
                  <ActionIcon color="red" onClick={() => handleDelete(indent)} variant="subtle" aria-label="Delete">
                    <IconTrash size={16} />
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
        title={
          <Group gap="xs">
            {editing ? <IconEdit size={20} /> : <IconPlus size={20} />}
            <span>{editing ? 'Edit Indent' : 'Add New Indent'}</span>
          </Group>
        }
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <DatePickerInput
            label="Date Received"
            placeholder="Select date"
            {...form.getInputProps('dateReceived')}
            onChange={(v) => form.setFieldValue('dateReceived', toDateOrNull(v))}
            mb="sm"
            leftSection={<IconCalendarEvent size={16} />}
          />
          <TimeInput
            label="Time Received"
            {...form.getInputProps('timeReceived')}
            mb="sm"
            leftSection={<IconClock size={16} />}
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
            leftSection={<IconCategory size={16} />}
          />
          <Select
            label="Ward Name"
            placeholder="Select ward"
            data={wards.map((w) => ({ value: w.name, label: w.name }))}
            {...form.getInputProps('wardName')}
            mb="sm"
            searchable
            leftSection={<IconBuildingHospital size={16} />}
          />
          <NumberInput
            label="Number of Rx"
            placeholder="Enter number"
            min={1}
            {...form.getInputProps('numberOfRx')}
            mb="sm"
            leftSection={<IconPill size={16} />}
          />
          {editing && (
            <Switch
              label="Counterchecked"
              checked={form.values.counterchecked}
              onChange={(e) => form.setFieldValue('counterchecked', e.currentTarget.checked)}
              mb="sm"
              onLabel={<IconCheckbox size={14} />}
              offLabel={<IconCheckbox size={14} />}
            />
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)} leftSection={<IconX size={16} />}>Cancel</Button>
            <Button type="submit" leftSection={editing ? <IconDeviceFloppy size={16} /> : <IconPlus size={16} />}>{editing ? 'Update' : 'Create'}</Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
