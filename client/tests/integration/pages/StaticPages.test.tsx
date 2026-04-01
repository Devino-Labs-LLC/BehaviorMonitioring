import React from 'react';
import { render, screen } from '@testing-library/react';

const mockRedirect = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (...args: any[]) => mockRedirect(...args),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));
jest.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'geist-sans' }),
  Geist_Mono: () => ({ variable: 'geist-mono' }),
}));
jest.mock('../../../src/components/AuthBootstrap', () => () => <div data-testid="auth-bootstrap" />);
jest.mock('../../../src/components/header', () => () => <div data-testid="header" />);
jest.mock('../../../src/components/footer', () => () => <div data-testid="footer" />);

import RootLayout from '../../../src/app/layout';
import HomePage from '../../../src/app/page';
import NotFound from '../../../src/app/not-found';
import AboutPage from '../../../src/app/About/page';
import ContactPage from '../../../src/app/Contact/page';

describe('Static Pages Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the root layout shell', () => {
    const layout = RootLayout({
      children: <div>Child Content</div>,
    });

    expect(React.isValidElement(layout)).toBe(true);
    expect(layout.props.lang).toBe('en');
    expect(layout.props.children.props.children[1].props.children).toBe('Child Content');
  });

  it('redirects the landing page to the dashboard', () => {
    HomePage();

    expect(mockRedirect).toHaveBeenCalledWith('/Dashboard');
  });

  it('renders the not found page content', () => {
    render(<NotFound />);

    expect(screen.getByText(/does not exist/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'homepage link' })).toHaveAttribute('href', '/');
  });

  it('renders the about page', () => {
    render(<AboutPage />);

    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('renders the contact page', () => {
    render(<ContactPage />);

    expect(screen.getByText('Contact')).toBeInTheDocument();
  });
});
