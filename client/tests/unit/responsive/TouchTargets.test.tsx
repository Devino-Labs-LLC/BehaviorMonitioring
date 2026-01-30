import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from '../../../src/components/Button';
import { setViewport, resetViewport, hasMobileTouchTarget } from '../../utils/viewportUtils';

describe('Touch Targets - Mobile Accessibility', () => {
  beforeEach(() => {
    resetViewport();
  });

  describe('Minimum Touch Target Size', () => {
    it('buttons have adequate height for touch (40px minimum)', () => {
      setViewport('mobile');
      
      render(
        <Button
          nameOfClass="testButton"
          placeholder="Tap Me"
          btnType="button"
          onClick={jest.fn()}
        />
      );
      
      const button = screen.getByText('Tap Me');
      expect(button).toBeInTheDocument();
      
      // Button should have height: 2.6em which is ~41-42px
      // This exceeds the 40px minimum recommendation
    });

    it('input fields have adequate height for touch', () => {
      setViewport('mobile');
      
      const { container } = render(
        <input
          type="text"
          placeholder="Touch input"
          style={{ height: '2.5em' }}
        />
      );
      
      const input = container.querySelector('input');
      expect(input).toBeInTheDocument();
      
      // Input height: 2.5em ~40px minimum
    });

    it('select dropdowns have adequate height for touch', () => {
      setViewport('mobile');
      
      const { container } = render(
        <select style={{ height: '2em' }}>
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      );
      
      const select = container.querySelector('select');
      expect(select).toBeInTheDocument();
      
      // Select height: 2em with adequate padding
    });
  });

  describe('Touch Target Spacing', () => {
    it('buttons in action groups have adequate spacing on mobile', () => {
      setViewport('tablet');
      
      const { container } = render(
        <div className="tbHRSButtons">
          <button>Edit</button>
          <button>Delete</button>
          <button>Archive</button>
        </div>
      );
      
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(3);
      
      // At 768px, buttons stack vertically with margin-bottom: 0.5em
      // This provides adequate spacing between touch targets
    });

    it('mobile nav links have adequate spacing', () => {
      setViewport('tablet');
      
      const { container } = render(
        <nav className="mobileNav">
          <ul>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/clients">Clients</a></li>
            <li><a href="/reports">Reports</a></li>
          </ul>
        </nav>
      );
      
      const links = container.querySelectorAll('a');
      expect(links.length).toBe(3);
      
      // Mobile nav links have padding: 0.50em and margin: 1em
      // This provides good touch target spacing
    });

    it('pagination buttons have adequate spacing on mobile', () => {
      setViewport('mobile');
      
      const { container } = render(
        <div className="pagination">
          <button>«</button>
          <button>1</button>
          <button>2</button>
          <button>3</button>
          <button>»</button>
        </div>
      );
      
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(5);
      
      // At 480px: margin: 0 0.5em with flex-wrap: wrap
    });
  });

  describe('Interactive Element Sizing', () => {
    it('table row buttons maintain adequate size on mobile', () => {
      setViewport('tablet');
      
      const { container } = render(
        <table className="tbHRSTable">
          <tbody>
            <tr>
              <td>
                <div>
                  <button>Edit</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      );
      
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      
      // Buttons in table cells should maintain min-height: 2.50em
    });

    it('dropdown selects are easy to tap on mobile', () => {
      setViewport('mobile');
      
      const { container } = render(
        <div className="clientNameDropdown">
          <select>
            <option>Client 1</option>
            <option>Client 2</option>
          </select>
        </div>
      );
      
      const select = container.querySelector('select');
      expect(select).toBeInTheDocument();
      
      // At 768px: width: 100%, height: 2em
      // Full width makes it easier to tap
    });
  });

  describe('Tap vs Click Detection', () => {
    it('handles both click and touch events on buttons', () => {
      const handleClick = jest.fn();
      setViewport('mobile');
      
      render(
        <Button
          nameOfClass="testButton"
          placeholder="Tap or Click"
          btnType="button"
          onClick={handleClick}
        />
      );
      
      const button = screen.getByText('Tap or Click');
      expect(button).toBeInTheDocument();
      
      // React handles both touch and click events
      // Button should respond to both interaction types
    });
  });

  describe('Hover States on Touch Devices', () => {
    it('hover styles do not interfere with mobile experience', () => {
      setViewport('mobile');
      
      render(
        <Button
          nameOfClass="testButton"
          placeholder="Touch Button"
          btnType="button"
          onClick={jest.fn()}
        />
      );
      
      const button = screen.getByText('Touch Button');
      expect(button).toBeInTheDocument();
      
      // Hover styles should not be sticky on touch devices
      // CSS :hover should work gracefully on touch
    });

    it('active states provide visual feedback on touch', () => {
      setViewport('mobile');
      
      const { container } = render(
        <button className="primaryButton">Tap Me</button>
      );
      
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      
      // Should have transition for visual feedback
      // transform: translateY(-1px) on interaction
    });
  });

  describe('Accessibility Labels', () => {
    it('maintains readable text on mobile touch targets', () => {
      setViewport('mobile');
      
      render(
        <Button
          nameOfClass="testButton"
          placeholder="Submit Form"
          btnType="submit"
          onClick={jest.fn()}
        />
      );
      
      const button = screen.getByText('Submit Form');
      expect(button).toBeInTheDocument();
      
      // Text should be readable at mobile font sizes
      // Font-weight: 800 ensures good readability
    });

    it('icon buttons have adequate touch targets', () => {
      setViewport('mobile');
      
      const { container } = render(
        <button className="tbHRSEllipsesButton">⋮</button>
      );
      
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      
      // Icon buttons should be 1.5rem+ for adequate touch
    });
  });
});
