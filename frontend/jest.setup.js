import '@testing-library/jest-dom'

// Mock dayjs for Mantine dates
const mockDayjs = (date) => {
  const d = date ? new Date(date) : new Date();
  return {
    toDate: () => d,
    format: (format) => {
      if (format === 'YYYY-MM-DD') {
        return d.toISOString().split('T')[0];
      }
      return d.toISOString();
    },
    subtract: (amount, unit) => mockDayjs(new Date(d.getTime() - (amount * 24 * 60 * 60 * 1000))),
    add: (amount, unit) => mockDayjs(new Date(d.getTime() + (amount * 24 * 60 * 60 * 1000)))
  };
};

// Set up global dayjs mock
global.dayjs = mockDayjs;

// Mock dayjs module
jest.mock('dayjs', () => mockDayjs);

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})