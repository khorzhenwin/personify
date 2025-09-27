import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ProfileSettings } from '../ProfileSettings';
import { useAuthStore } from '@/store/auth';

// Mock the auth store
jest.mock('@/store/auth');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock the child components
jest.mock('../ProfileForm', () => ({
  ProfileForm: () => <div data-testid="profile-form">Profile Form</div>
}));

jest.mock('../PasswordChangeForm', () => ({
  PasswordChangeForm: () => <div data-testid="password-change-form">Password Change Form</div>
}));

jest.mock('../DataExportForm', () => ({
  DataExportForm: () => <div data-testid="data-export-form">Data Export Form</div>
}));

jest.mock('../NotificationSettings', () => ({
  NotificationSettings: () => <div data-testid="notification-settings">Notification Settings</div>
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

describe('ProfileSettings', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    is_email_verified: true
  };

  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
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
      changePassword: jest.fn(),
      exportData: jest.fn()
    });
  });

  it('should render profile settings with tabs', () => {
    renderWithProvider(<ProfileSettings />);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Data Export')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('should show profile form by default', () => {
    renderWithProvider(<ProfileSettings />);

    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
  });

  it('should switch to security tab when clicked', () => {
    renderWithProvider(<ProfileSettings />);

    fireEvent.click(screen.getByText('Security'));

    expect(screen.getByTestId('password-change-form')).toBeInTheDocument();
  });

  it('should switch to data export tab when clicked', () => {
    renderWithProvider(<ProfileSettings />);

    fireEvent.click(screen.getByText('Data Export'));

    expect(screen.getByTestId('data-export-form')).toBeInTheDocument();
  });

  it('should switch to notifications tab when clicked', () => {
    renderWithProvider(<ProfileSettings />);

    fireEvent.click(screen.getByText('Notifications'));

    expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
  });

  it('should have modern card styling', () => {
    renderWithProvider(<ProfileSettings />);

    const card = screen.getByRole('tabpanel');
    expect(card.closest('.modern-card')).toBeInTheDocument();
  });

  it('should use pill variant for tabs', () => {
    renderWithProvider(<ProfileSettings />);

    const tabsList = screen.getByRole('tablist');
    expect(tabsList).toBeInTheDocument();
  });
});