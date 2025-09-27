'use client';

import { Container, Title, Text, Button, Group, Stack, Box } from '@mantine/core';
import { IconHome, IconArrowLeft, IconError404 } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { designTokens } from '@/theme';

export default function NotFound() {
  const router = useRouter();

  return (
    <Container size="md" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Stack align="center" gap="xl" style={{ width: '100%', textAlign: 'center' }}>
        {/* Modern 404 Illustration */}
        <Box
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${designTokens.colors.primary}20, ${designTokens.colors.secondary}20)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'float 3s ease-in-out infinite',
          }}
        >
          <IconError404 
            size={80} 
            color={designTokens.colors.primary}
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
            }}
          />
        </Box>

        {/* Error Content */}
        <Stack align="center" gap="md">
          <Title 
            order={1} 
            size="3rem"
            style={{
              background: `linear-gradient(135deg, ${designTokens.colors.primary}, ${designTokens.colors.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 800,
            }}
          >
            404
          </Title>
          
          <Title order={2} size="1.5rem" c="dimmed" fw={600}>
            Page Not Found
          </Title>
          
          <Text size="lg" c="dimmed" maw={500}>
            Oops! The page you're looking for doesn't exist. It might have been moved, deleted, 
            or you entered the wrong URL.
          </Text>
        </Stack>

        {/* Action Buttons */}
        <Group gap="md">
          <Button
            leftSection={<IconArrowLeft size={18} />}
            variant="outline"
            size="md"
            onClick={() => router.back()}
            style={{
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Go Back
          </Button>
          
          <Button
            leftSection={<IconHome size={18} />}
            size="md"
            onClick={() => router.push('/dashboard')}
            style={{
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Go Home
          </Button>
        </Group>

        {/* Helpful Links */}
        <Stack align="center" gap="xs" mt="xl">
          <Text size="sm" c="dimmed" fw={500}>
            Need help? Try these popular pages:
          </Text>
          <Group gap="lg">
            <Button 
              variant="subtle" 
              size="sm" 
              onClick={() => router.push('/transactions')}
            >
              Transactions
            </Button>
            <Button 
              variant="subtle" 
              size="sm" 
              onClick={() => router.push('/budgets')}
            >
              Budgets
            </Button>
            <Button 
              variant="subtle" 
              size="sm" 
              onClick={() => router.push('/profile')}
            >
              Profile
            </Button>
          </Group>
        </Stack>
      </Stack>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </Container>
  );
}