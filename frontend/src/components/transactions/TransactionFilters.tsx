'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  TextInput,
  Select,
  NumberInput,
  Button,
  Group,
  Stack,
  Chip,
  Text,
  Box,
  Grid,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  IconSearch,
  IconFilter,
  IconX,
  IconDownload,
  IconFilterOff,
} from '@tabler/icons-react';
import { useTransactionStore } from '@/store/transactions';
import { TransactionFilters as FilterType } from '@/types/transaction';
import { designTokens } from '@/theme';
// import { useDebouncedValue } from '@mantine/hooks';
import dayjs from 'dayjs';

export const TransactionFilters: React.FC = () => {
  const {
    categories,
    filters,
    setFilters,
    clearFilters,
    fetchCategories,
    exportTransactions,
  } = useTransactionStore();

  // Local state for form inputs
  const [localFilters, setLocalFilters] = useState<FilterType>(filters);
  const [searchValue, setSearchValue] = useState(filters.search || '');
  // const [debouncedSearch] = useDebouncedValue(searchValue, 500);

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Update local filters when store filters change
  useEffect(() => {
    setLocalFilters(filters);
    setSearchValue(filters.search || '');
  }, [filters]);

  // Handle search
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setFilters({ search: value });
  };

  const handleFilterChange = (key: keyof FilterType, value: string | number | undefined) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    setFilters({ [key]: value });
  };

  const handleClearFilters = () => {
    setLocalFilters({
      search: '',
      category_id: '',
      transaction_type: '',
      date_from: '',
      date_to: '',
      amount_min: undefined,
      amount_max: undefined,
    });
    setSearchValue('');
    clearFilters();
  };

  const categoryOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color,
  }));

  const transactionTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
  ];

  // Get active filters for chips
  const getActiveFilters = () => {
    const active = [];
    
    if (filters.search) {
      active.push({ key: 'search', label: `Search: ${filters.search}`, value: filters.search });
    }
    
    if (filters.category_id) {
      const category = categories.find(c => c.id === filters.category_id);
      active.push({ 
        key: 'category_id', 
        label: `Category: ${category?.name || 'Unknown'}`, 
        value: filters.category_id,
        color: category?.color 
      });
    }
    
    if (filters.transaction_type) {
      active.push({ 
        key: 'transaction_type', 
        label: `Type: ${filters.transaction_type}`, 
        value: filters.transaction_type 
      });
    }
    
    if (filters.date_from) {
      active.push({ 
        key: 'date_from', 
        label: `From: ${dayjs(filters.date_from).format('MMM D, YYYY')}`, 
        value: filters.date_from 
      });
    }
    
    if (filters.date_to) {
      active.push({ 
        key: 'date_to', 
        label: `To: ${dayjs(filters.date_to).format('MMM D, YYYY')}`, 
        value: filters.date_to 
      });
    }
    
    if (filters.amount_min !== undefined) {
      active.push({ 
        key: 'amount_min', 
        label: `Min: $${filters.amount_min}`, 
        value: filters.amount_min 
      });
    }
    
    if (filters.amount_max !== undefined) {
      active.push({ 
        key: 'amount_max', 
        label: `Max: $${filters.amount_max}`, 
        value: filters.amount_max 
      });
    }
    
    return active;
  };

  const activeFilters = getActiveFilters();
  const hasActiveFilters = activeFilters.length > 0;

  // Validation
  const dateRangeError = localFilters.date_from && localFilters.date_to && 
    dayjs(localFilters.date_from).isAfter(dayjs(localFilters.date_to)) 
    ? 'From date cannot be after to date' : null;

  const amountRangeError = localFilters.amount_min !== undefined && 
    localFilters.amount_max !== undefined && 
    localFilters.amount_min > localFilters.amount_max 
    ? 'Min amount cannot be greater than max amount' : null;

  return (
    <Card
      radius="lg"
      shadow="md"
      p="lg"
      style={{
        border: `1px solid ${designTokens.colors.gray[200]}`,
      }}
      data-testid="transaction-filters"
    >
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconFilter size={20} color={designTokens.colors.gray[600]} />
            <Text size="lg" fw={600} c="gray.8">
              Filters
            </Text>
          </Group>
          
          <Group gap="sm">
            <Tooltip label="Export filtered transactions">
              <Button
                variant="subtle"
                leftSection={<IconDownload size={16} />}
                onClick={exportTransactions}
                size="sm"
                radius="md"
              >
                Export CSV
              </Button>
            </Tooltip>
            
            {hasActiveFilters && (
              <Tooltip label="Clear all filters">
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconFilterOff size={16} />}
                  onClick={handleClearFilters}
                  size="sm"
                  radius="md"
                >
                  Clear Filters
                </Button>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* Search */}
        <TextInput
          placeholder="Search transactions..."
          leftSection={<IconSearch size={16} />}
          value={searchValue}
          onChange={(e) => handleSearchChange(e.currentTarget.value)}
          radius="md"
          size="md"
        />

        {/* Filter Grid */}
        <Grid>
          {/* Category Filter */}
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Select
              label="Category"
              placeholder="All categories"
              data={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
              value={localFilters.category_id || ''}
              onChange={(value) => handleFilterChange('category_id', value || '')}
              clearable
              searchable
              radius="md"
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.colors.gray[700],
                  marginBottom: designTokens.spacing.xs,
                },
                input: {
                  border: `1px solid ${designTokens.colors.gray[300]}`,
                  transition: 'all 0.2s ease',
                  '&:focus': {
                    borderColor: designTokens.colors.primary,
                    boxShadow: `0 0 0 3px ${designTokens.colors.primary}20`,
                  },
                },
                option: {
                  padding: designTokens.spacing.sm,
                },
              }}
              renderOption={({ option }) => {
                const categoryOption = categoryOptions.find(c => c.value === option.value);
                return (
                  <Group gap="sm">
                    {categoryOption && (
                      <Box
                        w={12}
                        h={12}
                        style={{
                          backgroundColor: categoryOption.color,
                          borderRadius: '50%',
                        }}
                      />
                    )}
                    <Text size="sm">{option.label}</Text>
                  </Group>
                );
              }}
            />
          </Grid.Col>

          {/* Transaction Type Filter */}
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Stack gap="xs">
              <Text size="sm" fw={500} c="gray.7">
                Type
              </Text>
              <Chip.Group
                value={localFilters.transaction_type || ''}
                onChange={(value) => handleFilterChange('transaction_type', value as string)}
              >
                <Group gap="xs">
                  <Chip value="" variant="light" radius="md">All</Chip>
                  <Chip value="income" variant="light" radius="md" color="green">Income</Chip>
                  <Chip value="expense" variant="light" radius="md" color="red">Expense</Chip>
                </Group>
              </Chip.Group>
            </Stack>
          </Grid.Col>

          {/* Date Range */}
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <DateInput
              label="From Date"
              placeholder="Select start date"
              value={localFilters.date_from ? new Date(localFilters.date_from) : null}
              onChange={(date) => handleFilterChange('date_from', date ? dayjs(date).format('YYYY-MM-DD') : '')}
              maxDate={localFilters.date_to ? new Date(localFilters.date_to) : new Date()}
              clearable
              radius="md"
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.colors.gray[700],
                  marginBottom: designTokens.spacing.xs,
                },
                input: {
                  border: `1px solid ${designTokens.colors.gray[300]}`,
                  transition: 'all 0.2s ease',
                  '&:focus': {
                    borderColor: designTokens.colors.primary,
                    boxShadow: `0 0 0 3px ${designTokens.colors.primary}20`,
                  },
                },
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <DateInput
              label="To Date"
              placeholder="Select end date"
              value={localFilters.date_to ? new Date(localFilters.date_to) : null}
              onChange={(date) => handleFilterChange('date_to', date ? dayjs(date).format('YYYY-MM-DD') : '')}
              minDate={localFilters.date_from ? new Date(localFilters.date_from) : undefined}
              maxDate={new Date()}
              clearable
              radius="md"
              error={dateRangeError}
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.colors.gray[700],
                  marginBottom: designTokens.spacing.xs,
                },
                input: {
                  border: `1px solid ${designTokens.colors.gray[300]}`,
                  transition: 'all 0.2s ease',
                  '&:focus': {
                    borderColor: designTokens.colors.primary,
                    boxShadow: `0 0 0 3px ${designTokens.colors.primary}20`,
                  },
                },
              }}
            />
          </Grid.Col>

          {/* Amount Range */}
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <NumberInput
              label="Min Amount"
              placeholder="$0.00"
              value={localFilters.amount_min}
              onChange={(value) => handleFilterChange('amount_min', value || undefined)}
              min={0}
              max={localFilters.amount_max || 999999.99}
              decimalScale={2}
              prefix="$"
              radius="md"
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.colors.gray[700],
                  marginBottom: designTokens.spacing.xs,
                },
                input: {
                  border: `1px solid ${designTokens.colors.gray[300]}`,
                  transition: 'all 0.2s ease',
                  '&:focus': {
                    borderColor: designTokens.colors.primary,
                    boxShadow: `0 0 0 3px ${designTokens.colors.primary}20`,
                  },
                },
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <NumberInput
              label="Max Amount"
              placeholder="$999,999.99"
              value={localFilters.amount_max}
              onChange={(value) => handleFilterChange('amount_max', value || undefined)}
              min={localFilters.amount_min || 0}
              max={999999.99}
              decimalScale={2}
              prefix="$"
              radius="md"
              error={amountRangeError}
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  color: designTokens.colors.gray[700],
                  marginBottom: designTokens.spacing.xs,
                },
                input: {
                  border: `1px solid ${designTokens.colors.gray[300]}`,
                  transition: 'all 0.2s ease',
                  '&:focus': {
                    borderColor: designTokens.colors.primary,
                    boxShadow: `0 0 0 3px ${designTokens.colors.primary}20`,
                  },
                },
              }}
            />
          </Grid.Col>
        </Grid>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <Stack gap="xs">
            <Text size="sm" fw={500} c="gray.7">
              Active Filters:
            </Text>
            <Group gap="xs">
              {activeFilters.map((filter) => (
                <Chip
                  key={filter.key}
                  checked
                  variant="filled"
                  radius="md"
                  style={{
                    backgroundColor: filter.color ? `${filter.color}15` : `${designTokens.colors.primary}15`,
                    color: filter.color || designTokens.colors.primary,
                    border: `1px solid ${filter.color || designTokens.colors.primary}30`,
                  }}
                >
                  <Group gap={4} wrap="nowrap">
                    <Text size="xs">{filter.label}</Text>
                    <ActionIcon
                      size="xs"
                      variant="transparent"
                      onClick={() => handleFilterChange(filter.key as keyof FilterType, 
                        filter.key.includes('amount') ? undefined : '')}
                      aria-label="Remove filter"
                    >
                      <IconX size={10} />
                    </ActionIcon>
                  </Group>
                </Chip>
              ))}
            </Group>
          </Stack>
        )}
      </Stack>
    </Card>
  );
};