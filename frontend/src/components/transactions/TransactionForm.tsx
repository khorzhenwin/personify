'use client';

import React, { useEffect } from 'react';
import {
  Card,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
  Alert,
  Text,
  Box,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconPlus, IconEdit } from '@tabler/icons-react';
import { useTransactionStore } from '@/store/transactions';
import { CreateTransactionData } from '@/types/transaction';
import { designTokens } from '@/theme';
import dayjs from 'dayjs';

interface TransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const {
    categories,
    isCreating,
    isUpdating,
    error,
    createTransaction,
    updateTransaction,
    fetchCategories,
    selectedTransaction,
    setSelectedTransaction,
  } = useTransactionStore();

  const isEditing = !!selectedTransaction;
  const isLoading = isCreating || isUpdating;

  const form = useForm<CreateTransactionData>({
    initialValues: {
      description: '',
      amount: 0,
      category_id: '',
      transaction_type: 'expense',
      date: dayjs().format('YYYY-MM-DD'),
    },
    validate: {
      description: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Description is required';
        }
        if (value.trim().length < 3) {
          return 'Description must be at least 3 characters';
        }
        return null;
      },
      amount: (value) => {
        if (!value || value <= 0) {
          return value === 0 ? 'Amount is required' : 'Amount must be positive';
        }
        if (value > 999999.99) {
          return 'Amount is too large';
        }
        return null;
      },
      date: (value) => {
        if (!value) {
          return 'Date is required';
        }
        const date = dayjs(value);
        if (!date.isValid()) {
          return 'Invalid date';
        }
        if (date.isAfter(dayjs(), 'day')) {
          return 'Date cannot be in the future';
        }
        return null;
      },
    },
  });

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Pre-fill form when editing
  useEffect(() => {
    if (selectedTransaction) {
      form.setValues({
        description: selectedTransaction.description,
        amount: selectedTransaction.amount,
        category_id: selectedTransaction.category?.id || '',
        transaction_type: selectedTransaction.transaction_type,
        date: selectedTransaction.date,
      });
    }
  }, [selectedTransaction?.id]);

  const handleSubmit = async (values: CreateTransactionData) => {
    try {
      if (isEditing && selectedTransaction) {
        await updateTransaction(selectedTransaction.id, values);
        setSelectedTransaction(null);
      } else {
        await createTransaction(values);
        form.reset();
      }
      onSuccess?.();
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      setSelectedTransaction(null);
    }
    form.reset();
    onCancel?.();
  };

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color,
  }));

  const transactionTypeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
  ];

  return (
    <Card
      radius="lg"
      shadow="md"
      p="xl"
      style={{
        border: `1px solid ${designTokens.colors.gray[200]}`,
        background: 'white',
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)} role="form">
        <Stack gap="lg">
          {/* Form Title */}
          <Group gap="sm">
            {isEditing ? <IconEdit size={20} /> : <IconPlus size={20} />}
            <Text size="lg" fw={600} c="gray.8">
              {isEditing ? 'Edit Transaction' : 'Add New Transaction'}
            </Text>
          </Group>

          {/* Error Alert */}
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              radius="md"
            >
              {error}
            </Alert>
          )}

          {/* Form Fields */}
          <Stack gap="md">
            {/* Description */}
            <TextInput
              label="Description"
              placeholder="Enter transaction description"
              required
              radius="md"
              size="md"
              {...form.getInputProps('description')}
            />

            {/* Amount and Category Row */}
            <Group grow>
              <NumberInput
                label="Amount"
                placeholder="0.00"
                required
                radius="md"
                size="md"
                min={0}
                max={999999.99}
                decimalScale={2}
                fixedDecimalScale
                thousandSeparator=","
                prefix="$"
                {...form.getInputProps('amount')}
              />

              <Select
                label="Category"
                placeholder="Select category"
                data={categoryOptions}
                radius="md"
                size="md"
                searchable
                clearable
                renderOption={({ option }) => (
                  <Group gap="sm">
                    <Box
                      w={12}
                      h={12}
                      style={{
                        backgroundColor: categoryOptions.find(c => c.value === option.value)?.color || designTokens.colors.gray[400],
                        borderRadius: '50%',
                      }}
                    />
                    <Text size="sm">{option.label}</Text>
                  </Group>
                )}
                {...form.getInputProps('category_id')}
              />
            </Group>

            {/* Transaction Type and Date Row */}
            <Group grow>
              <Select
                label="Transaction Type"
                data={transactionTypeOptions}
                required
                radius="md"
                size="md"
                {...form.getInputProps('transaction_type')}
              />

              <DateInput
                label="Date"
                placeholder="Select date"
                required
                radius="md"
                size="md"
                maxDate={new Date()}
                valueFormat="YYYY-MM-DD"
                value={form.values.date ? new Date(form.values.date) : null}
                onChange={(date) => {
                  form.setFieldValue('date', date ? dayjs(date).format('YYYY-MM-DD') : '');
                }}
                error={form.errors.date}
              />
            </Group>
          </Stack>

          {/* Action Buttons */}
          <Group justify="flex-end" gap="sm" mt="md">
            {(isEditing || onCancel) && (
              <Button
                variant="subtle"
                color="gray"
                onClick={handleCancel}
                disabled={isLoading}
                radius="md"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              loading={isLoading}
              leftSection={isEditing ? <IconEdit size={16} /> : <IconPlus size={16} />}
              radius="md"
            >
              {isEditing ? 'Update Transaction' : 'Add Transaction'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
};