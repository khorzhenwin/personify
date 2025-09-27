import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../AuthGuard';
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

const renderAuthGuard = (props = {}) => {
  const defaultProps = {
    children: <div>Protected Content</div>,
    requireAuth: true,
    redirectTo: '/auth/login',
    ...props,
  };

  return render(
    <MantineProvider theme={theme}>
      <AuthGuard {...defaultProps} />
    </MantineProvider>
  );
};

describe('AuthGuard', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should show loading state when authentication is loading', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    renderAuthGuard();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated and auth is required', async () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    renderAuthGuard();

    // Fast-forward timers to trigger the redirect
    jest.advanceTimersByTime(200);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated and auth is required', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
    });

    renderAuthGuard();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should redirect to dashboard when user is authenticated but auth is not required', async () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, email: 'test@example.com', first_name: 'John', last_name: 'Doe' },
    });

    renderAuthGuard({ requireAuth: false });

    // Fast-forward timers to trigger the redirect
    jest.advanceTimersByTime(200);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is not authenticated and auth is not required', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    renderAuthGuard({ requireAuth: false });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should use custom redirect path', async () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    renderAuthGuard({ redirectTo: '/custom-login' });

    // Fast-forward timers to trigger the redirect
    jest.advanceTimersByTime(200);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-login');
    });
  });

  it('should show redirecting message when redirecting unauthenticated user', async () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    renderAuthGuard();

    // Initially should show redirecting message
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Fast-forward timers to trigger the redirect
    jest.advanceTimersByTime(200);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login');
    });
  });

  it('should not redirect immediately to allow for hydration', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    renderAuthGuard();

    // Should not redirect immediately
    expect(mockPush).not.toHaveBeenCalled();

    // Should show redirecting state
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
  });

  it('should handle loading state properly', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    renderAuthGuard();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should have proper styling for loading state', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    renderAuthGuard();

    const loadingContainer = screen.getByText('Loading...').closest('div');
    expect(loadingContainer).toHaveStyle({
      height: '100vh',
    });
  });

  it('should clear timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    (useAuthStore as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    const { unmount } = renderAuthGuard();
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });
});