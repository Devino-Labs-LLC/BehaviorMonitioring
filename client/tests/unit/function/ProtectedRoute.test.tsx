import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../../../src/function/ProtectedRoute';
import { isAuthenticated } from '../../../src/function/VerificationCheck';

jest.mock('../../../src/function/VerificationCheck', () => ({
  isAuthenticated: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
  Outlet: () => <div>protected-content</div>,
}), { virtual: true });

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the outlet for authenticated users', () => {
    mockIsAuthenticated.mockReturnValue(true);

    render(<ProtectedRoute />);

    expect(screen.getByText('protected-content')).toBeInTheDocument();
  });

  it('navigates unauthenticated users to login', () => {
    mockIsAuthenticated.mockReturnValue(false);

    render(<ProtectedRoute />);

    expect(screen.getByText('navigate:/login')).toBeInTheDocument();
  });
});
