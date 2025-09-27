import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { PasswordChangeForm } from '../PasswordChangeForm';
import { useAuthStore } from '@/store/auth';
import { notifications } from '@mantine/notifications';

// Mock the auth store
jest.mock('@/store/auth');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock notifications
jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn()
  }
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

describe('PasswordChangeForm', () => {
  const mockChangePassword = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: null,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
      setLoading: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: mockChangePassword,
      exportData: jest.fn()
    });
  });

  it('should render password change form', () => {
    renderWithProvider(<PasswordChangeForm />);

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
  });

  it('should show security alert', () => {
    renderWithProvider(<PasswordChangeForm />);

    expect(screen.getByText('Password Security')).toBeInTheDocument();
    expect(screen.getByText(/choose a strong password/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    renderWithProvider(<PasswordChangeForm />);

    const submitButton = screen.getByText('Change Password');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Current password is required')).toBeInTheDocument();
      expect(screen.getByText('New password is required')).toBeInTheDocument();
    });
  });

  it('should validate password length', async () => {
    renderWithProvider(<PasswordChangeForm />);

    const newPasswordInput = screen.getByLabelText(/new password/i);
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('should validate password confirmation match', async () => {
    renderWithProvider(<PasswordChangeForm />);

    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('should show password strength indicator', () => {
    renderWithProvider(<PasswordChangeForm />);

    const newPasswordInput = screen.getByLabelText(/new password/i);
    fireEvent.change(newPasswordInput, { target: { value: 'Password123!' } });

    expect(screen.getByText('Password Strength')).toBeInTheDocument();
    expect(screen.getByText('Password Requirements:')).toBeInTheDocument();
  });

  it('should show password requirements checklist', () => {
    renderWithProvider(<PasswordChangeForm />);

    const newPasswordInput = screen.getByLabelText(/new password/i);
    fireEvent.change(newPasswordInput, { target: { value: 'Password123!' } });

    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Contains lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('Contains uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('Contains number')).toBeInTheDocument();
    expect(screen.getByText('Contains special character')).toBeInTheDocument();
  });

  it('should disable submit button for weak passwords', () => {
    renderWithProvider(<PasswordChangeForm />);

    const newPasswordInput = screen.getByLabelText(/new password/i);
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(newPasswordInput, { target: { value: 'weak' } });

    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button for strong passwords', () => {
    renderWithProvider(<PasswordChangeForm />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });

    expect(submitButton).not.toBeDisabled();
  });

  it('should submit form with valid data', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    renderWithProvider(<PasswordChangeForm />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        current_password: 'oldpassword',
        new_password: 'Password123!',
        new_password_confirm: 'Password123!'
      });
    });

    expect(notifications.show).toHaveBeenCalledWith({
      title: 'Success',
      message: 'Password changed successfully',
      color: 'green',
      icon: expect.any(Object)
    });
  });

  it('should handle change password error', async () => {
    mockChangePassword.mockRejectedValue(new Error('Current password is incorrect'));
    renderWithProvider(<PasswordChangeForm />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'wrongpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Current password is incorrect',
        color: 'red',
        icon: expect.any(Object)
      });
    });
  });

  it('should reset form after successful submission', async () => {
    mockChangePassword.mockResolvedValue(undefined);
    renderWithProvider(<PasswordChangeForm />);

    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'oldpassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(currentPasswordInput).toHaveValue('');
      expect(newPasswordInput).toHaveValue('');
      expect(confirmPasswordInput).toHaveValue('');
    });
  });
});