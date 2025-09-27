import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { DataExportForm } from '../DataExportForm';
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

describe('DataExportForm', () => {
  const mockExportData = jest.fn();

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
      changePassword: jest.fn(),
      exportData: mockExportData
    });
  });

  it('should render data export form', () => {
    renderWithProvider(<DataExportForm />);

    expect(screen.getByText('Data Export')).toBeInTheDocument();
    expect(screen.getByText('Export Format')).toBeInTheDocument();
    expect(screen.getByText('Date Range (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Data Types')).toBeInTheDocument();
    expect(screen.getByText('Export Data')).toBeInTheDocument();
  });

  it('should show export information alert', () => {
    renderWithProvider(<DataExportForm />);

    expect(screen.getByText(/export your financial data/i)).toBeInTheDocument();
  });

  it('should have format selection', () => {
    renderWithProvider(<DataExportForm />);

    const formatSelect = screen.getByLabelText(/file format/i);
    expect(formatSelect).toBeInTheDocument();
  });

  it('should show format description', () => {
    renderWithProvider(<DataExportForm />);

    // Default is CSV
    expect(screen.getByText(/csv format is ideal for spreadsheet/i)).toBeInTheDocument();
  });

  it('should update format description when JSON selected', async () => {
    renderWithProvider(<DataExportForm />);

    const formatSelect = screen.getByLabelText(/file format/i);
    fireEvent.change(formatSelect, { target: { value: 'json' } });

    await waitFor(() => {
      expect(screen.getByText(/json format is perfect for developers/i)).toBeInTheDocument();
    });
  });

  it('should have date range inputs', () => {
    renderWithProvider(<DataExportForm />);

    expect(screen.getByLabelText(/from date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to date/i)).toBeInTheDocument();
  });

  it('should have data type switches', () => {
    renderWithProvider(<DataExportForm />);

    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Always Included')).toBeInTheDocument();
    expect(screen.getByLabelText(/categories/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/budgets/i)).toBeInTheDocument();
  });

  it('should validate date range', async () => {
    renderWithProvider(<DataExportForm />);

    const fromDateInput = screen.getByLabelText(/from date/i);
    const toDateInput = screen.getByLabelText(/to date/i);
    const submitButton = screen.getByText('Export Data');

    // Set invalid date range (from > to)
    fireEvent.change(fromDateInput, { target: { value: '2024-12-31' } });
    fireEvent.change(toDateInput, { target: { value: '2024-01-01' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Start date must be before end date')).toBeInTheDocument();
    });
  });

  it('should submit export with default values', async () => {
    mockExportData.mockResolvedValue(undefined);
    renderWithProvider(<DataExportForm />);

    const submitButton = screen.getByText('Export Data');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalledWith({
        format: 'csv',
        date_from: undefined,
        date_to: undefined,
        include_categories: true,
        include_budgets: true
      });
    });

    expect(notifications.show).toHaveBeenCalledWith({
      title: 'Export Complete',
      message: 'Your data has been exported successfully',
      color: 'green',
      icon: expect.any(Object)
    });
  });

  it('should submit export with custom values', async () => {
    mockExportData.mockResolvedValue(undefined);
    renderWithProvider(<DataExportForm />);

    const formatSelect = screen.getByLabelText(/file format/i);
    const categoriesSwitch = screen.getByLabelText(/categories/i);
    const budgetsSwitch = screen.getByLabelText(/budgets/i);
    const submitButton = screen.getByText('Export Data');

    fireEvent.change(formatSelect, { target: { value: 'json' } });
    fireEvent.click(categoriesSwitch);
    fireEvent.click(budgetsSwitch);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalledWith({
        format: 'json',
        date_from: undefined,
        date_to: undefined,
        include_categories: false,
        include_budgets: false
      });
    });
  });

  it('should show progress during export', async () => {
    mockExportData.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderWithProvider(<DataExportForm />);

    const submitButton = screen.getByText('Export Data');
    fireEvent.click(submitButton);

    expect(screen.getByText('Exporting Data...')).toBeInTheDocument();
    expect(screen.getByText('Preparing your data...')).toBeInTheDocument();
  });

  it('should handle export error', async () => {
    mockExportData.mockRejectedValue(new Error('Export failed'));
    renderWithProvider(<DataExportForm />);

    const submitButton = screen.getByText('Export Data');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Export Failed',
        message: 'Export failed',
        color: 'red',
        icon: expect.any(Object)
      });
    });
  });

  it('should reset form when reset button clicked', () => {
    renderWithProvider(<DataExportForm />);

    const formatSelect = screen.getByLabelText(/file format/i);
    const categoriesSwitch = screen.getByLabelText(/categories/i);
    const resetButton = screen.getByText('Reset');

    // Change values
    fireEvent.change(formatSelect, { target: { value: 'json' } });
    fireEvent.click(categoriesSwitch);

    // Reset
    fireEvent.click(resetButton);

    // Should be back to defaults
    expect(formatSelect).toHaveValue('csv');
    expect(categoriesSwitch).toBeChecked();
  });

  it('should show export information section', () => {
    renderWithProvider(<DataExportForm />);

    expect(screen.getByText('Export Information')).toBeInTheDocument();
    expect(screen.getByText(/exported files contain only your personal data/i)).toBeInTheDocument();
    expect(screen.getByText(/csv exports are provided as a zip file/i)).toBeInTheDocument();
    expect(screen.getByText(/json exports contain all data in a single/i)).toBeInTheDocument();
    expect(screen.getByText(/store exported files securely/i)).toBeInTheDocument();
  });

  it('should disable buttons during export', async () => {
    mockExportData.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    renderWithProvider(<DataExportForm />);

    const submitButton = screen.getByText('Export Data');
    const resetButton = screen.getByText('Reset');

    fireEvent.click(submitButton);

    expect(resetButton).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});