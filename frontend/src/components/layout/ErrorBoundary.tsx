'use client';

import { Component, ReactNode } from 'react';
import { Container, Title, Text, Button, Group, Stack, Box, Alert } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconHome, IconBug } from '@tabler/icons-react';
import { designTokens } from '@/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service
      console.error('Production error:', { error, errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container 
          size="md" 
          style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center',
            padding: designTokens.spacing.xl,
          }}
          data-testid="error-boundary"
        >
          <Stack align="center" gap="xl" style={{ width: '100%', textAlign: 'center' }}>
            {/* Modern Error Illustration */}
            <Box
              style={{
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${designTokens.colors.error}20, ${designTokens.colors.warning}20)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              <IconAlertTriangle 
                size={64} 
                color={designTokens.colors.error}
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
                }}
              />
            </Box>

            {/* Error Content */}
            <Stack align="center" gap="md">
              <Title 
                order={1} 
                size="2rem"
                c="red"
                fw={700}
              >
                Something went wrong
              </Title>
              
              <Text size="lg" c="dimmed" maw={600}>
                We're sorry, but something unexpected happened. Our team has been notified 
                and is working to fix the issue.
              </Text>
            </Stack>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert 
                icon={<IconBug size={16} />} 
                title="Development Error Details" 
                color="red"
                style={{ textAlign: 'left', maxWidth: '100%' }}
              >
                <Text size="sm" ff="monospace">
                  {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text size="xs" ff="monospace" c="dimmed" mt="xs">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </Text>
                )}
              </Alert>
            )}

            {/* Action Buttons */}
            <Group gap="md">
              <Button
                leftSection={<IconRefresh size={18} />}
                variant="outline"
                size="md"
                onClick={this.handleRetry}
                data-testid="retry-button"
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
                Try Again
              </Button>
              
              <Button
                leftSection={<IconHome size={18} />}
                size="md"
                onClick={this.handleGoHome}
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

            {/* Help Text */}
            <Text size="sm" c="dimmed" mt="xl">
              If this problem persists, please contact support with the error details above.
            </Text>
          </Stack>

          {/* CSS Animation */}
          <style jsx>{`
            @keyframes pulse {
              0%, 100% {
                transform: scale(1);
                opacity: 1;
              }
              50% {
                transform: scale(1.05);
                opacity: 0.8;
              }
            }
          `}</style>
        </Container>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}