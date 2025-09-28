'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Text,
  Badge,
  ActionIcon,
  Group,
  Pagination,
  Skeleton,
  Stack,
  Alert,
  Modal,
  Button,
  Center,
  Box,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconAlertCircle,
  IconReceipt,
  IconPlus,
} from '@tabler/icons-react';
import { useTransactionStore } from '@/store/transactions';
import { Transaction } from '@/types/transaction';
import { designTokens } from '@/theme';
import dayjs from 'dayjs';

interface TransactionListProps {
  onEditTransaction?: (transaction: Transaction) => void;
  onCreateTransaction?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  onEditTransaction,
  onCreateTransaction,
}) => {
  const {
    transactions,
    isLoading,
    error,
    pagination,
    fetchTransactions,
    setPage,
    deleteTransaction,
    setSelectedTransaction,
    isDeleting,
  } = useTransactionStore();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []); // Only run on mount

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    onEditTransaction?.(transaction);
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (transactionToDelete) {
      await deleteTransaction(transactionToDelete.id);
      setDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
  };

  const formatAmount = (amount: number, type: 'income' | 'expense') => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
    
    return type === 'income' ? `+${formatted}` : `-${formatted}`;
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('MMM D, YYYY');
  };

  // Loading skeleton component
  const TransactionSkeleton = () => (
    <tr data-testid="transaction-skeleton">
      <td><Skeleton height={20} width="80%" /></td>
      <td><Skeleton height={20} width="60%" /></td>
      <td><Skeleton height={20} width="40%" /></td>
      <td><Skeleton height={20} width="50%" /></td>
      <td><Skeleton height={20} width="70%" /></td>
      <td><Skeleton height={20} width="30%" /></td>
    </tr>
  );

  // Empty state component
  const EmptyState = () => (
    <Center py={60}>
      <Stack align="center" gap="md">
        <Box
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: designTokens.colors.gray[100],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconReceipt size={40} color={designTokens.colors.gray[400]} />
        </Box>
        <Stack align="center" gap="xs">
          <Text size="lg" fw={600} c="gray.7">
            No transactions found
          </Text>
          <Text size="sm" c="gray.5" ta="center">
            Start by adding your first transaction
          </Text>
        </Stack>
        {onCreateTransaction && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={onCreateTransaction}
            variant="light"
          >
            Add Transaction
          </Button>
        )}
      </Stack>
    </Center>
  );

  if (error) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Error"
        color="red"
        variant="light"
      >
        {error}
      </Alert>
    );
  }

  return (
    <>
      <Card
        radius="lg"
        shadow="md"
        style={{
          border: `1px solid ${designTokens.colors.gray[200]}`,
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <Table
            striped
            highlightOnHover
            style={{
              '--table-hover-color': designTokens.colors.gray[50],
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Description</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <TransactionSkeleton key={index} />
              ))}
            </Table.Tbody>
          </Table>
        ) : transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <Table
            striped
            highlightOnHover
            style={{
              '--table-hover-color': designTokens.colors.gray[50],
            }}
          >
            <Table.Thead>
              <Table.Tr
                style={{
                  backgroundColor: designTokens.colors.gray[50],
                }}
              >
                <Table.Th
                  style={{
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.colors.gray[700],
                  }}
                >
                  Description
                </Table.Th>
                <Table.Th
                  style={{
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.colors.gray[700],
                  }}
                >
                  Category
                </Table.Th>
                <Table.Th
                  style={{
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.colors.gray[700],
                  }}
                >
                  Amount
                </Table.Th>
                <Table.Th
                  style={{
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.colors.gray[700],
                  }}
                >
                  Type
                </Table.Th>
                <Table.Th
                  style={{
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.colors.gray[700],
                  }}
                >
                  Date
                </Table.Th>
                <Table.Th
                  style={{
                    fontWeight: designTokens.typography.fontWeight.semibold,
                    color: designTokens.colors.gray[700],
                  }}
                >
                  Actions
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {transactions.map((transaction, index) => (
                <Table.Tr
                  key={transaction.id}
                  className="transaction-row"
                  style={{
                    backgroundColor: index % 2 === 0 ? 'white' : designTokens.colors.gray[50],
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = designTokens.colors.gray[50];
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = designTokens.shadows.sm;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : designTokens.colors.gray[50];
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Table.Td>
                    <Text fw={500} size="sm">
                      {transaction.description}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {transaction.category ? (
                      <Badge
                        variant="light"
                        style={{
                          backgroundColor: `${transaction.category.color}15`,
                          color: transaction.category.color,
                          border: `1px solid ${transaction.category.color}30`,
                        }}
                      >
                        {transaction.category.name}
                      </Badge>
                    ) : (
                      <Text size="sm" c="gray.5">
                        Uncategorized
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text
                      fw={600}
                      size="sm"
                      c={transaction.transaction_type === 'income' ? 'green.6' : 'red.6'}
                    >
                      {formatAmount(transaction.amount, transaction.transaction_type)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={transaction.transaction_type === 'income' ? 'green' : 'red'}
                    >
                      {transaction.transaction_type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="gray.6">
                      {formatDate(transaction.date)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(transaction);
                        }}
                        aria-label="Edit transaction"
                        style={{
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(transaction);
                        }}
                        aria-label="Delete transaction"
                        loading={isDeleting}
                        style={{
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Group justify="center" mt="md" pb="md">
            <Pagination
              value={pagination.page}
              onChange={setPage}
              total={pagination.totalPages}
              size="sm"
              radius="md"
              withEdges
            />
          </Group>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Transaction"
        centered
        radius="lg"
        styles={{
          title: {
            fontWeight: designTokens.typography.fontWeight.semibold,
            fontSize: designTokens.typography.fontSize.lg,
          },
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="gray.7">
            Are you sure you want to delete this transaction? This action cannot be undone.
          </Text>
          
          {transactionToDelete && (
            <Card
              withBorder
              radius="md"
              p="sm"
              style={{
                backgroundColor: designTokens.colors.gray[50],
              }}
            >
              <Group justify="space-between">
                <Text fw={500} size="sm">
                  {transactionToDelete.description}
                </Text>
                <Text
                  fw={600}
                  size="sm"
                  c={transactionToDelete.transaction_type === 'income' ? 'green.6' : 'red.6'}
                >
                  {formatAmount(transactionToDelete.amount, transactionToDelete.transaction_type)}
                </Text>
              </Group>
            </Card>
          )}

          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteConfirm}
              loading={isDeleting}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};