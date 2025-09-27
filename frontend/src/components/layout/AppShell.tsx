'use client';

import { AppShell, Burger, Group, Text, UnstyledButton, Stack, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconDashboard, 
  IconCreditCard, 
  IconPigMoney, 
  IconChartBar, 
  IconUser, 
  IconLogout 
} from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { designTokens } from '@/theme';
import { ThemeToggle } from './ThemeToggle';

interface NavLinkProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
  onClick?: () => void;
}

function NavLink({ icon, label, href, active, onClick }: NavLinkProps) {
  const router = useRouter();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <UnstyledButton
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Navigate to ${label}`}
      aria-current={active ? 'page' : undefined}
      data-testid={`nav-link-${label.toLowerCase().replace(' ', '-')}`}
      style={{
        display: 'block',
        width: '100%',
        padding: designTokens.spacing.sm,
        borderRadius: designTokens.borderRadius.md,
        color: active ? designTokens.colors.primary : designTokens.colors.gray[600],
        backgroundColor: active ? `${designTokens.colors.primary}10` : 'transparent',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: active ? `${designTokens.colors.primary}15` : designTokens.colors.gray[100],
        },
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = `2px solid ${designTokens.colors.primary}`;
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      <Group gap="sm">
        <span aria-hidden="true">{icon}</span>
        <Text size="sm" fw={active ? 600 : 400}>
          {label}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

interface AppShellLayoutProps {
  children: React.ReactNode;
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const navLinks = [
    { icon: <IconDashboard size={20} />, label: 'Dashboard', href: '/dashboard' },
    { icon: <IconCreditCard size={20} />, label: 'Transactions', href: '/transactions' },
    { icon: <IconPigMoney size={20} />, label: 'Budgets', href: '/budgets' },
    { icon: <IconChartBar size={20} />, label: 'Analytics', href: '/analytics' },
    { icon: <IconUser size={20} />, label: 'Profile', href: '/profile' },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger 
              opened={opened} 
              onClick={toggle} 
              hiddenFrom="sm" 
              size="sm"
              aria-label={opened ? 'Close navigation menu' : 'Open navigation menu'}
              data-testid="mobile-menu-button"
            />
            <Text 
              size="xl" 
              fw={700} 
              c="primary"
              style={{ fontFamily: designTokens.typography.fontFamily.sans.join(', ') }}
              role="banner"
            >
              FinanceTracker
            </Text>
          </Group>
          
          <Group gap="sm">
            <ThemeToggle />
            {user && (
              <Text size="sm" c="dimmed" aria-label={`Welcome message for ${user.first_name}`}>
                Welcome, {user.first_name}
              </Text>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <nav role="navigation" aria-label="Main navigation" data-testid="main-navigation">
          <Stack gap="xs">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                active={pathname === link.href}
              />
            ))}
            
            <NavLink
              icon={<IconLogout size={20} />}
              label="Logout"
              href="#"
              onClick={handleLogout}
            />
          </Stack>
        </nav>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          backgroundColor: designTokens.colors.gray[50],
          minHeight: 'calc(100vh - 60px)',
        }}
      >
        <main role="main" aria-label="Main content">
          {children}
        </main>
      </AppShell.Main>
    </AppShell>
  );
}