import React from 'react';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../../../src/function/ProtectedRoute';

const mockIsAuthenticated = jest.fn();

jest.mock('../../../src/function/VerificationCheck', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
}));
jest.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">redirect:{to}</div>,
  Outlet: () => <div data-testid="outlet">protected content</div>,
}), { virtual: true });

describe('ProtectedRoute', () => {
  it('renders the protected outlet for authenticated users', () => {
    mockIsAuthenticated.mockReturnValue(true);

    render(<ProtectedRoute />);

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('redirects unauthenticated users', () => {
    mockIsAuthenticated.mockReturnValue(false);

    render(<ProtectedRoute />);

    expect(screen.getByTestId('navigate')).toHaveTextContent('redirect:/login');
  });
});
