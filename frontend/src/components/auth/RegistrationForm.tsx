'use client';

import { useState } from 'react';
import {
  Card,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Alert,
  Anchor,
  Group,
  Stepper,
  Progress,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { 
  IconMail, 
  IconLock, 
  IconUser, 
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, RegisterData } from '@/store/auth';
import { designTokens } from '@/theme';

interface FormData extends RegisterData {
  confirmPassword: string;
}

export function RegistrationForm() {
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, error, clearError } = useAuthStore();
  const router = useRouter();

  const form = useForm<FormData>({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email is required';
        if (!/^\S+@\S+$/.test(value)) return 'Invalid email format';
        return null;
      },
      first_name: (value) => {
        if (!value) return 'First name is required';
        if (value.length < 2) return 'First name must be at least 2 characters';
        return null;
      },
      last_name: (value) => {
        if (!value) return 'Last name is required';
        if (value.length < 2) return 'Last name must be at least 2 characters';
        return null;
      },
      password: (value) => {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) return 'Please confirm your password';
        if (value !== values.password) return 'Passwords do not match';
        return null;
      },
    },
  });

  const steps = [
    {
      label: 'Personal Info',
      description: 'Enter your basic information',
    },
    {
      label: 'Account Details',
      description: 'Set up your account credentials',
    },
    {
      label: 'Security',
      description: 'Create a secure password',
    },
  ];

  const validateCurrentStep = () => {
    const errors = form.validate();
    
    switch (activeStep) {
      case 0:
        return !errors.hasErrors || (!errors.errors.first_name && !errors.errors.last_name);
      case 1:
        return !errors.hasErrors || !errors.errors.email;
      case 2:
        return !errors.hasErrors || (!errors.errors.password && !errors.errors.confirmPassword);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setActiveStep((current) => (current < 2 ? current + 1 : current));
    }
  };

  const prevStep = () => {
    setActiveStep((current) => (current > 0 ? current - 1 : current));
  };

  const handleSubmit = async (values: FormData) => {
    try {
      setIsSubmitting(true);
      clearError();
      
      const { confirmPassword, ...registerData } = values;
      // Add password_confirm field that the backend expects
      const backendData = {
        ...registerData,
        password_confirm: confirmPassword,
      };
      await register(backendData as any);
      router.push('/dashboard');
    } catch (error) {
      // Error is handled by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack gap="md">
            <TextInput
              label="First Name"
              placeholder="Enter your first name"
              leftSection={<IconUser size={16} />}
              required
              {...form.getInputProps('first_name')}
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  marginBottom: designTokens.spacing.xs,
                },
              }}
            />
            <TextInput
              label="Last Name"
              placeholder="Enter your last name"
              leftSection={<IconUser size={16} />}
              required
              {...form.getInputProps('last_name')}
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  marginBottom: designTokens.spacing.xs,
                },
              }}
            />
          </Stack>
        );

      case 1:
        return (
          <Stack gap="md">
            <TextInput
              label="Email Address"
              placeholder="Enter your email address"
              leftSection={<IconMail size={16} />}
              required
              {...form.getInputProps('email')}
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  marginBottom: designTokens.spacing.xs,
                },
              }}
            />
          </Stack>
        );

      case 2:
        return (
          <Stack gap="md">
            <PasswordInput
              label="Password"
              placeholder="Create a secure password"
              leftSection={<IconLock size={16} />}
              required
              {...form.getInputProps('password')}
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  marginBottom: designTokens.spacing.xs,
                },
              }}
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              leftSection={<IconLock size={16} />}
              required
              {...form.getInputProps('confirmPassword')}
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  marginBottom: designTokens.spacing.xs,
                },
              }}
            />
            <Text size="xs" c="dimmed">
              Password must contain at least 8 characters with uppercase, lowercase, and numbers.
            </Text>
          </Stack>
        );

      default:
        return null;
    }
  };

  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <Card
      shadow="lg"
      padding="xl"
      radius="lg"
      style={{
        width: '100%',
        maxWidth: '500px',
        border: `1px solid ${designTokens.colors.gray[200]}`,
      }}
    >
      <Stack gap="lg">
        <Stack gap="xs" align="center">
          <Title 
            order={2} 
            ta="center"
            style={{ 
              color: designTokens.colors.gray[800],
              fontWeight: designTokens.typography.fontWeight.bold,
            }}
          >
            Create Account
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            Join us to start managing your finances
          </Text>
        </Stack>

        <Stack gap="md">
          <Progress 
            value={progress} 
            color="primary" 
            size="sm" 
            radius="xl"
            style={{ marginBottom: designTokens.spacing.sm }}
          />
          
          <Stepper 
            active={activeStep} 
            size="sm"
            styles={{
              step: {
                minWidth: '100px',
              },
              stepLabel: {
                fontSize: designTokens.typography.fontSize.sm,
                fontWeight: designTokens.typography.fontWeight.medium,
              },
              stepDescription: {
                fontSize: designTokens.typography.fontSize.xs,
              },
            }}
          >
            {steps.map((step, index) => (
              <Stepper.Step
                key={index}
                label={step.label}
                description={step.description}
                completedIcon={<IconCheck size={16} />}
              />
            ))}
          </Stepper>
        </Stack>

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

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            {renderStepContent()}

            <Group justify="space-between" mt="md">
              {activeStep > 0 && (
                <Button 
                  variant="light" 
                  onClick={prevStep}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}
              
              {activeStep < steps.length - 1 ? (
                <Button 
                  onClick={nextStep}
                  style={{ marginLeft: activeStep === 0 ? 'auto' : 0 }}
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="submit"
                  loading={isSubmitting}
                  style={{ marginLeft: 'auto' }}
                >
                  Create Account
                </Button>
              )}
            </Group>
          </Stack>
        </form>

        <Group justify="center" gap="xs">
          <Text size="sm" c="dimmed">
            Already have an account?
          </Text>
          <Anchor component={Link} href="/auth/login" size="sm">
            Sign in
          </Anchor>
        </Group>
      </Stack>
    </Card>
  );
}