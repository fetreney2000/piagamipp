'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Button, Table, Modal, TextInput, Group, Title, ActionIcon, Text,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import {
  IconBuildingHospital, IconPlus, IconEdit, IconTrash, IconX, IconDeviceFloppy,
} from '@tabler/icons-react';

interface Ward {
  _id: string;
  name: string;
}

export default function WardsPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<Ward | null>(null);

  const form = useForm({
    initialValues: { name: '' },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Ward name is required' : null),
    },
  });

  const fetchWards = useCallback(async () => {
    const res = await fetch('/api/wards');
    const data = await res.json();
    setWards(data);
  }, []);

  useEffect(() => {
    fetchWards();
  }, [fetchWards]);

  const openAddModal = () => {
    setEditing(null);
    form.reset();
    setModalOpened(true);
  };

  const openEditModal = (ward: Ward) => {
    setEditing(ward);
    form.setValues({ name: ward.name });
    setModalOpened(true);
  };

  const handleSubmit = async (values: { name: string }) => {
    if (editing) {
      const res = await fetch(`/api/wards/${editing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        showNotification({ title: 'Success', message: 'Ward updated', color: 'green' });
        fetchWards();
        setModalOpened(false);
      } else {
        const err = await res.json();
        showNotification({ title: 'Error', message: err.error || 'Failed to update ward', color: 'red' });
      }
    } else {
      const res = await fetch('/api/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        showNotification({ title: 'Success', message: 'Ward created', color: 'green' });
        fetchWards();
        setModalOpened(false);
      } else {
        const err = await res.json();
        showNotification({ title: 'Error', message: err.error || 'Failed to create ward', color: 'red' });
      }
    }
  };

  const handleDelete = (ward: Ward) => {
    modals.openConfirmModal({
      title: 'Delete Ward',
      children: <Text>Are you sure you want to delete ward &ldquo;{ward.name}&rdquo;?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        const res = await fetch(`/api/wards/${ward._id}`, { method: 'DELETE' });
        if (res.ok) {
          showNotification({ title: 'Success', message: 'Ward deleted', color: 'green' });
          fetchWards();
        } else {
          showNotification({ title: 'Error', message: 'Failed to delete ward', color: 'red' });
        }
      },
    });
  };

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <IconBuildingHospital size={28} />
          <Title order={2}>Ward Management</Title>
        </Group>
        <Button onClick={openAddModal} leftSection={<IconPlus size={16} />}>Add Ward</Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th><Group gap={4}><IconBuildingHospital size={14} />Ward Name</Group></Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {wards.map((ward) => (
            <Table.Tr key={ward._id}>
              <Table.Td>{ward.name}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="xs" variant="light" onClick={() => openEditModal(ward)} leftSection={<IconEdit size={14} />}>Edit</Button>
                  <ActionIcon color="red" onClick={() => handleDelete(ward)} variant="subtle" aria-label="Delete">
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={
          <Group gap="xs">
            {editing ? <IconEdit size={20} /> : <IconPlus size={20} />}
            <span>{editing ? 'Edit Ward' : 'Add Ward'}</span>
          </Group>
        }
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <TextInput
            label="Ward Name"
            placeholder="Enter ward name"
            {...form.getInputProps('name')}
            mb="sm"
            leftSection={<IconBuildingHospital size={16} />}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)} leftSection={<IconX size={16} />}>Cancel</Button>
            <Button type="submit" leftSection={editing ? <IconDeviceFloppy size={16} /> : <IconPlus size={16} />}>{editing ? 'Update' : 'Create'}</Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
