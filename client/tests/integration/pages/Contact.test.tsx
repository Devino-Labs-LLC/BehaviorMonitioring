import React from 'react';
import { render, screen } from '@testing-library/react';
import Contact from '../../../src/app/Contact/page';

jest.mock('next/head', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../../../src/components/header', () => ({
  __esModule: true,
  default: () => <div>Header</div>,
}));

jest.mock('../../../src/components/footer', () => ({
  __esModule: true,
  default: () => <div>Footer</div>,
}));

describe('Contact page', () => {
  it('renders the header, title, footer, and main contact content', () => {
    render(<Contact />);

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Contact');
    expect(document.title).toContain('Contact - BMetrics');
  });
});
