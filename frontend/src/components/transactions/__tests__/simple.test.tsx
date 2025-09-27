import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/theme';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MantineProvider theme={theme}>
      {children}
    </MantineProvider>
  );
};

const SimpleComponent = () => {
  return <div>Hello World</div>;
};

describe('Simple Test', () => {
  it('should render simple component', () => {
    render(
      <TestWrapper>
        <SimpleComponent />
      </TestWrapper>
    );

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});