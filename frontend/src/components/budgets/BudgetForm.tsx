'use client';

import { useEffect, useState } from 'react';
import {
  Modal,
  Stack,
  Title,
  Select,
  NumberInput,
  Slider,
  Button,
  Group,
  Card,
  Text,
  Box,
  Alert,
  Badge,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconWallet } from '@tabler/icons-react';
import { useBudgetStore } from '@/store/budgets';
import { Budget } from '@/types/budget';

interface BudgetFormProps {
  opened: boolean;
  onClose: () => void;
  month: string;
  budget?: Budget;
}

interface FormValues {
  category_id: string;
  amount: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatMonth = (monthString: string) => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const BudgetForm = ({ opened, onClose, month, budget }: BudgetFormProps) => {
  const {
    categories,
    isLoading,
    error,
    createBudget,
    updateBudget,
    fetchCategories,
  } = useBudgetStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const form = useForm<FormValues>({
    initialValues: {
      category_id: budget?.category.id ? String(budget.category.id) : '',
      amount: budget?.amount || 500,
    },
    validate: {
      category_id: (value) => (!value ? 'Category is required' : null),
      amount: (value) => (value <= 0 ? 'Amount must be greater than 0' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      fetchCategories();
      if (budget) {
        form.setValues({
          category_id: String(budget.category.id),
          amount: budget.amount,
        });
        setSelectedCategory(String(budget.category.id));
      }
    }
  }, [opened, budget, fetchCategories]);

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Convert month to YYYY-MM-DD format (first day of month)
      const monthDate = `${month}-01`;
      
      const data = {
        category_id: values.category_id, // Backend now supports 'category_id' field
        amount: values.amount,
        month: monthDate, // Backend expects YYYY-MM-DD format
      };

      if (budget) {
        await updateBudget(budget.id, data);
      } else {
        await createBudget(data);
      }
      
      onClose();
      form.reset();
      setSelectedCategory('');
    } catch (error) {
      // Error handling is done in the store
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (value: string | null) => {
    if (value) {
      form.setFieldValue('category_id', value);
      setSelectedCategory(value);
    }
  };

  const selectedCategoryData = categories.find(cat => String(cat.id) === selectedCategory);

  const categorySelectData = categories.map(category => ({
    value: String(category.id),
    label: category.name,
    color: category.color,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={budget ? 'Edit Budget' : 'Create Budget'}
      size="lg"
      centered
      className="animate-modal"
      styles={{
        modal: {
          transition: 'all 0.3s ease',
        },
      }}
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Error"
              color="red"
              variant="light"
            >
              {error}
            </Alert>
          )}

          {/* Month Display */}
          <Card p="sm" bg="gray.0" radius="md">
            <Group justify="center">
              <Text size="sm" c="dimmed">
                Budget for
              </Text>
              <Badge variant="light" size="lg">
                {formatMonth(month)}
              </Badge>
            </Group>
          </Card>

          {/* Category Selection */}
          <Select
            label="Category"
            placeholder="Select a category"
            data={categorySelectData}
            value={form.values.category_id}
            onChange={handleCategoryChange}
            error={form.errors.category_id}
            required
            renderOption={({ option, ...others }) => (
              <div {...others}>
                <Group gap="sm">
                  <Box
                    w={16}
                    h={16}
                    bg={option.color}
                    style={{ borderRadius: '50%' }}
                    data-testid="category-color"
                  />
                  <Text>{option.label}</Text>
                </Group>
              </div>
            )}
            styles={{
              item: {
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'var(--mantine-color-gray-1)',
                },
              },
            }}
          />

          {/* Amount Input with Slider */}
          <Stack gap="md">
            <NumberInput
              label="Budget Amount"
              placeholder="Enter budget amount"
              value={form.values.amount}
              onChange={(value) => form.setFieldValue('amount', Number(value) || 0)}
              error={form.errors.amount}
              min={0}
              max={10000}
              step={50}
              prefix="$"
              thousandSeparator=","
              required
              styles={{
                input: {
                  transition: 'all 0.2s ease',
                  '&:focus': {
                    transform: 'scale(1.01)',
                  },
                },
              }}
            />

            <Box>
              <Text size="sm" mb="xs" c="dimmed">
                Adjust with slider
              </Text>
              <Slider
                value={form.values.amount}
                onChange={(value) => form.setFieldValue('amount', value)}
                min={0}
                max={5000}
                step={50}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 1000, label: '$1K' },
                  { value: 2500, label: '$2.5K' },
                  { value: 5000, label: '$5K' },
                ]}
                color={selectedCategoryData?.color || 'blue'}
                styles={{
                  track: {
                    transition: 'all 0.3s ease',
                  },
                  thumb: {
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  },
                }}
              />
            </Box>
          </Stack>

          <Divider />

          {/* Budget Preview */}
          <Box>
            <Text size="sm" mb="md" c="dimmed">
              Budget Preview
            </Text>
            <Card
              p="lg"
              radius="md"
              data-testid="budget-preview"
              style={{
                background: selectedCategoryData 
                  ? `linear-gradient(135deg, ${selectedCategoryData.color}15 0%, ${selectedCategoryData.color}05 100%)`
                  : 'var(--mantine-color-gray-1)',
                border: selectedCategoryData 
                  ? `1px solid ${selectedCategoryData.color}30`
                  : '1px solid var(--mantine-color-gray-3)',
                transition: 'all 0.3s ease',
              }}
            >
              <Stack gap="md" align="center">
                <Group gap="sm">
                  {selectedCategoryData && (
                    <Box
                      w={20}
                      h={20}
                      bg={selectedCategoryData.color}
                      style={{ borderRadius: '50%' }}
                    />
                  )}
                  <Text fw={500}>
                    {selectedCategoryData?.name || 'Select a category'}
                  </Text>
                </Group>
                
                <Group gap="xs" align="baseline">
                  <IconWallet size={24} color={selectedCategoryData?.color || 'gray'} />
                  <Title order={2} c={selectedCategoryData?.color || 'gray'}>
                    {formatCurrency(form.values.amount)}
                  </Title>
                </Group>

                {selectedCategoryData && (
                  <Text size="sm" c="dimmed" ta="center">
                    Monthly budget for {selectedCategoryData.name}
                  </Text>
                )}
              </Stack>
            </Card>
          </Box>

          {/* Form Actions */}
          <Group justify="flex-end" gap="md">
            <Button
              variant="subtle"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!form.values.category_id || form.values.amount <= 0}
              color={selectedCategoryData?.color || 'blue'}
              style={{
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {isSubmitting 
                ? (budget ? 'Updating...' : 'Creating...') 
                : (budget ? 'Update Budget' : 'Create Budget')
              }
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};