'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Grid,
  Stack,
  Title,
  Text,
  Button,
  Group,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  ColorInput,
  Box,
  Center,
  Skeleton,
  Alert,
  Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconPlus, 
  IconEdit, 
  IconTrash, 
  IconAlertCircle,
  IconCategory
} from '@tabler/icons-react';
import { useBudgetStore } from '@/store/budgets';
import { Category } from '@/types/transaction';

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
}

const CategoryCard = ({ 
  category, 
  onEdit, 
  onDelete 
}: { 
  category: Category; 
  onEdit: () => void; 
  onDelete: () => void; 
}) => (
  <Card
    data-testid="category-card"
    p="lg"
    radius="md"
    style={{
      backgroundImage: `linear-gradient(135deg, ${category.color}15 0%, ${category.color}05 100%)`,
      backgroundColor: 'transparent',
      border: `1px solid ${category.color}30`,
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    }}
    className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
  >
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Group gap="sm">
          <Box
            w={24}
            h={24}
            bg={category.color}
            style={{ borderRadius: '50%' }}
            data-testid="category-color-indicator"
          />
          <Box>
            <Title order={4} mb={2}>
              {category.name}
            </Title>
            <Text size="sm" c="dimmed">
              {category.description || 'No description'}
            </Text>
          </Box>
        </Group>

        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            color="blue"
            size="sm"
            onClick={onEdit}
            aria-label="Edit category"
            className="transition-all duration-200 hover:scale-110"
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={onDelete}
            aria-label="Delete category"
            className="transition-all duration-200 hover:scale-110"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <Badge
        variant="light"
        color={category.color}
        size="sm"
        style={{ alignSelf: 'flex-start' }}
      >
        {category.color.toUpperCase()}
      </Badge>
    </Stack>
  </Card>
);

const CategorySkeleton = () => (
  <Card p="lg" radius="md" data-testid="category-skeleton">
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="sm">
          <Skeleton height={24} width={24} circle />
          <Box>
            <Skeleton height={20} width={120} mb="xs" />
            <Skeleton height={14} width={200} />
          </Box>
        </Group>
        <Group gap="xs">
          <Skeleton height={28} width={28} />
          <Skeleton height={28} width={28} />
        </Group>
      </Group>
      <Skeleton height={20} width={80} />
    </Stack>
  </Card>
);

const CategoryForm = ({ 
  opened, 
  onClose, 
  category 
}: { 
  opened: boolean; 
  onClose: () => void; 
  category?: Category; 
}) => {
  const { createCategory, updateCategory, isLoading } = useBudgetStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategoryFormData>({
    initialValues: {
      name: category?.name || '',
      description: category?.description || '',
      color: category?.color || '#3498db',
    },
    validate: {
      name: (value) => (!value.trim() ? 'Category name is required' : null),
      color: (value) => (!value ? 'Color is required' : null),
    },
  });

  useEffect(() => {
    if (opened && category) {
      form.setValues({
        name: category.name,
        description: category.description || '',
        color: category.color,
      });
    } else if (opened && !category) {
      form.reset();
    }
  }, [opened, category]);

  const handleSubmit = async (values: CategoryFormData) => {
    setIsSubmitting(true);
    
    try {
      if (category) {
        await updateCategory(category.id, values);
      } else {
        await createCategory(values);
      }
      onClose();
      form.reset();
    } catch (error) {
      // Error handling is done in the store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={category ? 'Edit Category' : 'Create Category'}
      size="md"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Category Name"
            placeholder="Enter category name"
            {...form.getInputProps('name')}
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

          <Textarea
            label="Description"
            placeholder="Enter category description (optional)"
            {...form.getInputProps('description')}
            minRows={2}
            maxRows={4}
            styles={{
              input: {
                transition: 'all 0.2s ease',
              },
            }}
          />

          <ColorInput
            label="Color"
            placeholder="Pick a color"
            {...form.getInputProps('color')}
            required
            swatches={[
              '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
              '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
              '#f1c40f', '#e91e63', '#9c27b0', '#673ab7',
            ]}
            styles={{
              input: {
                transition: 'all 0.2s ease',
              },
            }}
          />

          {/* Preview */}
          <Card
            p="md"
            radius="md"
            style={{
              backgroundImage: `linear-gradient(135deg, ${form.values.color}15 0%, ${form.values.color}05 100%)`,
              backgroundColor: 'transparent',
              border: `1px solid ${form.values.color}30`,
              transition: 'all 0.3s ease',
            }}
          >
            <Group gap="sm">
              <Box
                w={20}
                h={20}
                bg={form.values.color}
                style={{ borderRadius: '50%' }}
              />
              <Box>
                <Text fw={500}>
                  {form.values.name || 'Category Name'}
                </Text>
                <Text size="sm" c="dimmed">
                  {form.values.description || 'Category description'}
                </Text>
              </Box>
            </Group>
          </Card>

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
              color={form.values.color}
              className="transition-all duration-200 hover:scale-105"
            >
              {isSubmitting 
                ? (category ? 'Updating...' : 'Creating...') 
                : (category ? 'Update Category' : 'Create Category')
              }
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

const DeleteConfirmation = ({ 
  opened, 
  onClose, 
  category, 
  onConfirm 
}: { 
  opened: boolean; 
  onClose: () => void; 
  category?: Category; 
  onConfirm: () => void; 
}) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title="Delete Category"
    size="sm"
    centered
  >
    <Stack gap="md">
      <Text>
        Are you sure you want to delete &quot;{category?.name}&quot;? This action cannot be undone.
      </Text>
      
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Warning"
        color="orange"
        variant="light"
      >
        Transactions using this category will have their category removed.
      </Alert>

      <Group justify="flex-end" gap="md">
        <Button variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm}>
          Delete
        </Button>
      </Group>
    </Stack>
  </Modal>
);

export const CategoryManager = () => {
  const {
    categories,
    isLoading,
    error,
    fetchCategories,
    deleteCategory,
  } = useBudgetStore();

  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    openForm();
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    openDelete();
  };

  const handleDeleteConfirm = async () => {
    if (selectedCategory) {
      await deleteCategory(selectedCategory.id);
      closeDelete();
      setSelectedCategory(undefined);
    }
  };

  const handleFormClose = () => {
    closeForm();
    setSelectedCategory(undefined);
  };

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
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>Category Management</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openForm}
          className="animate-button transition-all duration-200 hover:scale-105"
          style={{
            backgroundImage: 'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-blue-7) 100%)',
            backgroundColor: 'transparent',
          }}
        >
          Add Category
        </Button>
      </Group>

      {isLoading ? (
        <Grid>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid.Col key={i} span={{ base: 12, sm: 6, lg: 4 }}>
              <CategorySkeleton />
            </Grid.Col>
          ))}
        </Grid>
      ) : categories.length > 0 ? (
        <Grid>
          {categories.map((category) => (
            <Grid.Col key={category.id} span={{ base: 12, sm: 6, lg: 4 }}>
              <CategoryCard
                category={category}
                onEdit={() => handleEdit(category)}
                onDelete={() => handleDelete(category)}
              />
            </Grid.Col>
          ))}
        </Grid>
      ) : (
        <Card p="xl" radius="md">
          <Center>
            <Stack align="center" gap="md">
              <IconCategory size={48} color="var(--mantine-color-gray-5)" />
              <Text c="dimmed" ta="center">
                No categories yet
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Create your first category to start organizing your transactions
              </Text>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={openForm}
                variant="light"
              >
                Create Category
              </Button>
            </Stack>
          </Center>
        </Card>
      )}

      <CategoryForm
        opened={formOpened}
        onClose={handleFormClose}
        category={selectedCategory}
      />

      <DeleteConfirmation
        opened={deleteOpened}
        onClose={closeDelete}
        category={selectedCategory}
        onConfirm={handleDeleteConfirm}
      />
    </Stack>
  );
};