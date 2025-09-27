import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { RegistrationForm } from '../RegistrationForm';
import { useAuthStore } from '@/store/auth';
import { theme } from '@/theme';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the auth store
jest.mock('@/store/auth', () => ({
  useAuthStore: jest.fn(),
}));

const mockPush = jest.fn();
const mockRegister = jest.fn();
const mockClearError = jest.fn();

const renderRegistrationForm = () => {
  return render(
    <MantineProvider theme={theme}>
      <RegistrationForm />
    </MantineProvider>
  );
};

describe('RegistrationForm', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useAuthStore as jest.Mock).mockReturnValue({
      register: mockRegister,
      error: null,
      clearError: mockClearError,
    });

    jest.clearAllMocks();
  });

  it('should render registration form with modern wizard design', () => {
    renderRegistrationForm();

    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByText('Join us to start managing your finances')).toBeInTheDocument();
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Account Details')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show first step with personal information fields', () => {
    renderRegistrationForm();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next step/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  it('should validate first step before proceeding', async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    const nextButton = screen.getByRole('button', { name: /next step/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });

    // Should still be on first step
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  });

  it('should proceed to second step with valid first step data', async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);

    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');

    const nextButton = screen.getByRole('button', { name: /next step/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  it('should validate email format in second step', async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    // Fill first step
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Try invalid email in second step
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email address/i);
      user.type(emailInput, 'invalid-email');
    });

    const nextButton = screen.getByRole('button', { name: /next step/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  it('should proceed to third step with valid email', async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    // Fill first step
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Fill second step
    await waitFor(async () => {
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john@example.com');
    });

    const nextButton = screen.getByRole('button', { name: /next step/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });
  });

  it('should validate password requirements', async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    // Navigate to third step
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    await waitFor(async () => {
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john@example.com');
    });
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Test weak password
    await waitFor(async () => {
      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'weak');
    });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('should validate password confirmation', async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    // Navigate to third step
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    await waitFor(async () => {
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john@example.com');
    });
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Test password mismatch
    await waitFor(async () => {
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'DifferentPassword123');
    });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue(undefined);
    renderRegistrationForm();

    // Fill all steps
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    await waitFor(async () => {
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'john@example.com');
    });
    await user.click(screen.getByRole('button', { name: /next step/i }));

    await waitFor(async () => {
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(passwordInput, 'Password123');
      await user.type(confirmPasswordInput, 'Password123');
    });

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockClearError).toHaveBeenCalled();
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'Password123',
        first_name: 'John',
        last_name: 'Doe',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should allow navigation back through steps', async () => {
    const user = userEvent.setup();
    renderRegistrationForm();

    // Go to second step
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /next step/i }));

    // Go back to first step
    await waitFor(() => {
      const backButton = screen.getByRole('button', { name: /back/i });
      user.click(backButton);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });
  });

  it('should display error message when registration fails', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      register: mockRegister,
      error: 'Email already exists',
      clearError: mockClearError,
    });

    renderRegistrationForm();

    expect(screen.getByText('Email already exists')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should show progress indicator', () => {
    renderRegistrationForm();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '33'); // First step = 33%
  });

  it('should have proper accessibility attributes', () => {
    renderRegistrationForm();

    const firstNameInput = screen.getByLabelText(/first name/i);
    const lastNameInput = screen.getByLabelText(/last name/i);

    expect(firstNameInput).toHaveAttribute('required');
    expect(lastNameInput).toHaveAttribute('required');
    expect(firstNameInput).toHaveAttribute('type', 'text');
    expect(lastNameInput).toHaveAttribute('type', 'text');
  });
});