import React from 'react';
import { render, screen } from '@testing-library/react';
import Link from '../../../src/components/Link';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, passHref: _passHref, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Link component', () => {
  it('renders email links with the expected aria label', () => {
    render(<Link href="mailto:test@example.com" hrefType="email" placeholder="Email Us" />);

    expect(screen.getByRole('link', { name: 'email Email Us' })).toHaveAttribute(
      'href',
      'mailto:test@example.com',
    );
  });

  it('renders phone links with the expected aria label', () => {
    render(<Link href="tel:5551234567" hrefType="phone" placeholder="Call Us" />);

    expect(screen.getByRole('link', { name: 'call Call Us' })).toHaveAttribute(
      'href',
      'tel:5551234567',
    );
  });

  it('renders Next links for non-email and non-phone href types', () => {
    render(<Link href="/About" hrefType="internal" placeholder="About" />);

    expect(screen.getByRole('link', { name: 'About link' })).toHaveAttribute('href', '/About');
  });
});
