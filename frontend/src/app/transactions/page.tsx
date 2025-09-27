'use client';

import React, { useState } from 'react';
import { Container, Stack, Title, Group, Button, Modal } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { TransactionList, TransactionForm, TransactionFilters } from '@/components/transactions';
import { Transaction } from '@/types/transaction';

export default function TransactionsPage() {
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleCreateTransaction = () => {
    setSelectedTransaction(null);
    setFormModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormModalOpen(true);
  };

  const handleFormSuccess = () => {
    setFormModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleFormCancel = () => {
    setFormModalOpen(false);
    setSelectedTransaction(null);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={1}>Transactions</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleCreateTransaction}
          >
            Add Transaction
          </Button>
        </Group>

        {/* Filters */}
        <TransactionFilters />

        {/* Transaction List */}
        <TransactionList
          onEditTransaction={handleEditTransaction}
          onCreateTransaction={handleCreateTransaction}
        />

        {/* Form Modal */}
        <Modal
          opened={formModalOpen}
          onClose={handleFormCancel}
          title={selectedTransaction ? 'Edit Transaction' : 'Add Transaction'}
          size="lg"
          centered
        >
          <TransactionForm
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </Modal>
      </Stack>
    </Container>
  );
}