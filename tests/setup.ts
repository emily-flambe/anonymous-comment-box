import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock global fetch for all tests
global.fetch = vi.fn();

// Mock window.location for navigation tests
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    reload: vi.fn(),
    assign: vi.fn(),
  },
  writable: true,
});

// Mock localStorage and sessionStorage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage,
  writable: true,
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Reset localStorage and sessionStorage
  mockStorage.getItem.mockReset();
  mockStorage.setItem.mockReset();
  mockStorage.removeItem.mockReset();
  mockStorage.clear.mockReset();
});