'use client';

import { useState } from 'react';
import { 
  Stack, 
  Tabs, 
  Container,
  Title,
  Text,
  Group,
  Button,
  Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { 
  IconWallet, 
  IconCategory, 
  IconAlertTriangle, 
  IconPlus
} from '@tabler/icons-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShellLayout } from '@/components/layout/AppShell';
import { 
  BudgetOverview, 
  BudgetForm, 
  CategoryManager, 
  BudgetAlerts 
} from '@/components/budgets';
import { useBudgetStore } from '@/store/budgets';
import { BudgetStatus, Budget } from '@/types/budget';

export default function BudgetsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [budgetFormOpened, { open: openBudgetForm, close: closeBudgetForm }] = useDisclosure(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>();
  const { currentMonth } = useBudgetStore();
  const router = useRouter();

  const handleAdjustBudget = (budgetStatus: BudgetStatus) => {
    setSelectedBudget(budgetStatus.budget);
    openBudgetForm();
  };

  const handleViewTransactions = (categoryId: string) => {
    // Navigate to transactions page with category filter
    router.push(`/transactions?category=${categoryId}`);
  };

  const handleBudgetFormClose = () => {
    closeBudgetForm();
    setSelectedBudget(undefined);
  };

  return (
    <AuthGuard>
      <AppShellLayout>
        <Container size="xl" py="md">
          <Stack gap="lg">
            {/* Page Header */}
            <Group justify="space-between" align="flex-end">
              <Box>
                <Title order={1} mb="xs">
                  Budget Management
                </Title>
                <Text c="dimmed">
                  Track your spending, set budgets, and manage categories
                </Text>
              </Box>
              
              <Group gap="md">
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={openBudgetForm}
                  className="animate-button"
                  style={{
                    background: 'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-blue-7) 100%)',
                  }}
                >
                  Create Budget
                </Button>
              </Group>
            </Group>

            {/* Main Content Tabs */}
            <Tabs 
              value={activeTab} 
              onChange={setActiveTab}
              variant="pills"
              radius="md"
              styles={{
                tab: {
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                  },
                  '&[dataActive="true"]': {
                    background: 'linear-gradient(135deg, var(--mantine-color-blue-6) 0%, var(--mantine-color-blue-7) 100%)',
                  },
                },
                panel: {
                  paddingTop: 'var(--mantine-spacing-lg)',
                },
              }}
            >
              <Tabs.List grow>
                <Tabs.Tab 
                  value="overview" 
                  leftSection={<IconWallet size={16} />}
                  className="micro-interaction"
                >
                  Budget Overview
                </Tabs.Tab>
                <Tabs.Tab 
                  value="alerts" 
                  leftSection={<IconAlertTriangle size={16} />}
                  className="micro-interaction"
                >
                  Alerts
                </Tabs.Tab>
                <Tabs.Tab 
                  value="categories" 
                  leftSection={<IconCategory size={16} />}
                  className="micro-interaction"
                >
                  Categories
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="overview">
                <BudgetOverview />
              </Tabs.Panel>

              <Tabs.Panel value="alerts">
                <BudgetAlerts 
                  onAdjustBudget={handleAdjustBudget}
                  onViewTransactions={handleViewTransactions}
                />
              </Tabs.Panel>

              <Tabs.Panel value="categories">
                <CategoryManager />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Container>

        {/* Budget Form Modal */}
        <BudgetForm
          opened={budgetFormOpened}
          onClose={handleBudgetFormClose}
          month={currentMonth}
          budget={selectedBudget}
        />
      </AppShellLayout>
    </AuthGuard>
  );
}