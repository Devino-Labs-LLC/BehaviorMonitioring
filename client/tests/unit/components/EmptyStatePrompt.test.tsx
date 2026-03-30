import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyStatePrompt from '../../../src/components/EmptyStatePrompt';
import { useRouter } from 'next/navigation';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('EmptyStatePrompt Component', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    });
  });

  describe('Visibility', () => {
    it('renders nothing when isVisible is false', () => {
      const { container } = render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={false}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('renders popup when isVisible is true', () => {
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
        />
      );
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    it('displays the correct title', () => {
      render(
        <EmptyStatePrompt
          title="No Clients Found"
          message="Test message"
          isVisible={true}
        />
      );
      
      expect(screen.getByRole('heading', { name: 'No Clients Found' })).toBeInTheDocument();
    });

    it('displays the correct message', () => {
      const message = "You don't have any clients yet. Would you like to add a new client?";
      render(
        <EmptyStatePrompt
          title="Test Title"
          message={message}
          isVisible={true}
        />
      );
      
      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });

  describe('Navigation Button', () => {
    it('renders navigation button when navigationPath is provided', () => {
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
          navigationPath="/Admin/manageClients/add"
          navigationLabel="Add New Client"
        />
      );
      
      expect(screen.getByRole('button', { name: 'Add New Client' })).toBeInTheDocument();
    });

    it('does not render navigation button when navigationPath is not provided', () => {
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
        />
      );
      
      expect(screen.queryByRole('button', { name: 'Add New Client' })).not.toBeInTheDocument();
    });

    it('uses default label "Go" when navigationLabel is not provided', () => {
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
          navigationPath="/some-path"
        />
      );
      
      expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    });

    it('navigates to correct path when navigation button is clicked', async () => {
      const user = userEvent.setup();
      const navigationPath = '/Admin/manageClients/add';
      
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
          navigationPath={navigationPath}
          navigationLabel="Add New Client"
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Add New Client' }));
      
      expect(mockPush).toHaveBeenCalledWith(navigationPath);
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('Close Button', () => {
    it('renders close button when onClose is provided', () => {
      const handleClose = jest.fn();
      
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
          onClose={handleClose}
        />
      );
      
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('does not render close button when onClose is not provided', () => {
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
        />
      );
      
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = jest.fn();
      
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
          onClose={handleClose}
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Close' }));
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Both Buttons', () => {
    it('renders both navigation and close buttons when both props are provided', () => {
      const handleClose = jest.fn();
      
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
          navigationPath="/Admin/manageClients/add"
          navigationLabel="Add New Client"
          onClose={handleClose}
        />
      );
      
      expect(screen.getByRole('button', { name: 'Add New Client' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('navigation button works independently of close button', async () => {
      const user = userEvent.setup();
      const handleClose = jest.fn();
      const navigationPath = '/Admin/manageClients/add';
      
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
          navigationPath={navigationPath}
          navigationLabel="Add New Client"
          onClose={handleClose}
        />
      );
      
      await user.click(screen.getByRole('button', { name: 'Add New Client' }));
      
      expect(mockPush).toHaveBeenCalledWith(navigationPath);
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for navigation button', () => {
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
          navigationPath="/some-path"
          navigationLabel="Add New Client"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Add New Client' });
      expect(button).toHaveAttribute('aria-label', 'Add New Client');
    });

    it('has proper ARIA labels for close button', () => {
      const handleClose = jest.fn();
      
      render(
        <EmptyStatePrompt
          title="Test Title"
          message="Test message"
          isVisible={true}
          onClose={handleClose}
        />
      );
      
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button).toHaveAttribute('aria-label', 'Close');
    });
  });

  describe('Integration Scenario', () => {
    it('displays complete "No Clients" prompt as designed', () => {
      const handleClose = jest.fn();
      
      render(
        <EmptyStatePrompt
          title="No Clients Found"
          message="You don't have any clients yet. Would you like to add a new client to get started?"
          isVisible={true}
          navigationPath="/Admin/manageClients/add"
          navigationLabel="Add New Client"
          onClose={handleClose}
        />
      );
      
      expect(screen.getByText('No Clients Found')).toBeInTheDocument();
      expect(screen.getByText("You don't have any clients yet. Would you like to add a new client to get started?")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add New Client' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('handles full user workflow: view prompt, navigate to add client', async () => {
      const user = userEvent.setup();
      const handleClose = jest.fn();
      
      render(
        <EmptyStatePrompt
          title="No Clients Found"
          message="You don't have any clients yet. Would you like to add a new client to get started?"
          isVisible={true}
          navigationPath="/Admin/manageClients/add"
          navigationLabel="Add New Client"
          onClose={handleClose}
        />
      );
      
      // User sees the prompt
      expect(screen.getByText('No Clients Found')).toBeInTheDocument();
      
      // User clicks "Add New Client"
      await user.click(screen.getByRole('button', { name: 'Add New Client' }));
      
      // Should navigate to add client page
      expect(mockPush).toHaveBeenCalledWith('/Admin/manageClients/add');
      
      // Close handler should not be called
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('handles dismissal workflow: view prompt, close it', async () => {
      const user = userEvent.setup();
      const handleClose = jest.fn();
      
      render(
        <EmptyStatePrompt
          title="No Clients Found"
          message="You don't have any clients yet. Would you like to add a new client to get started?"
          isVisible={true}
          navigationPath="/Admin/manageClients/add"
          navigationLabel="Add New Client"
          onClose={handleClose}
        />
      );
      
      // User sees the prompt
      expect(screen.getByText('No Clients Found')).toBeInTheDocument();
      
      // User clicks "Close"
      await user.click(screen.getByRole('button', { name: 'Close' }));
      
      // Should call close handler
      expect(handleClose).toHaveBeenCalledTimes(1);
      
      // Should not navigate
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
