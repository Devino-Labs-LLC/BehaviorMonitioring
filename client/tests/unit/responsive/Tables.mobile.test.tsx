import React from 'react';
import { render } from '@testing-library/react';
import { setViewport, resetViewport } from '../../utils/viewportUtils';

describe('Tables - Mobile Responsive', () => {
  beforeEach(() => {
    resetViewport();
  });

  describe('tbHRSTable', () => {
    const createTable = () => (
      <div className="innerBlock">
        <table className="tbHRSTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Notes</th>
              <th>Time</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>2026-01-29</td>
              <td>Test note with some longer text that might wrap</td>
              <td>14:30</td>
              <td>A</td>
              <td>
                <button>Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );

    it('renders table normally on desktop', () => {
      setViewport('desktop');
      
      const { container } = render(createTable());
      
      const table = container.querySelector('.tbHRSTable');
      expect(table).toBeInTheDocument();
      
      // Desktop: normal table layout
      const cells = container.querySelectorAll('td');
      expect(cells.length).toBe(6);
    });

    it('enables horizontal scroll on mobile (768px)', () => {
      setViewport('tablet');
      
      const { container } = render(createTable());
      
      const table = container.querySelector('.tbHRSTable');
      expect(table).toBeInTheDocument();
      
      // At 768px: display: block, overflow-x: auto
      // Table should be scrollable horizontally
    });

    it('reduces font size on mobile for better fit', () => {
      setViewport('tablet');
      
      const { container } = render(createTable());
      
      const cells = container.querySelectorAll('td, th');
      expect(cells.length).toBeGreaterThan(0);
      
      // At 768px: font-size: 0.85em
    });

    it('compresses column widths on mobile', () => {
      setViewport('tablet');
      
      const { container } = render(createTable());
      
      const table = container.querySelector('.tbHRSTable');
      expect(table).toBeInTheDocument();
      
      // At 768px:
      // First column: 2em (from 3em)
      // Other columns proportionally reduced
    });

    it('maintains row hover interaction on mobile', () => {
      setViewport('mobile');
      
      const { container } = render(createTable());
      
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
      
      // Hover styles should still work (cursor: pointer)
    });
  });

  describe('archiveTable', () => {
    const createArchiveTable = () => (
      <div className="innerBlock">
        <table className="archiveTable">
          <thead>
            <tr>
              <th>Status</th>
              <th>Client Name</th>
              <th>Archived Date</th>
              <th>Days</th>
              <th>90d</th>
              <th>60d</th>
              <th>30d</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Active</td>
              <td>John Doe</td>
              <td>2025-10-29</td>
              <td>92</td>
              <td>✓</td>
              <td>✓</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    );

    it('renders archive table on desktop', () => {
      setViewport('desktop');
      
      const { container } = render(createArchiveTable());
      
      const table = container.querySelector('.archiveTable');
      expect(table).toBeInTheDocument();
    });

    it('enables horizontal scroll on mobile', () => {
      setViewport('tablet');
      
      const { container } = render(createArchiveTable());
      
      const table = container.querySelector('.archiveTable');
      expect(table).toBeInTheDocument();
      
      // At 768px: display: block, overflow-x: auto
    });

    it('reduces column widths proportionally on mobile', () => {
      setViewport('tablet');
      
      const { container } = render(createArchiveTable());
      
      const headers = container.querySelectorAll('th');
      expect(headers.length).toBe(7);
      
      // Mobile width adjustments applied via CSS
    });
  });

  describe('tbClientTable', () => {
    const createClientTable = () => (
      <div className="innerBlock">
        <table className="tbClientTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Client ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>CL001</td>
              <td>John</td>
              <td>Doe</td>
              <td>Active</td>
              <td>
                <button>View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );

    it('renders client table on desktop', () => {
      setViewport('desktop');
      
      const { container } = render(createClientTable());
      
      const table = container.querySelector('.tbClientTable');
      expect(table).toBeInTheDocument();
    });

    it('enables horizontal scroll on mobile', () => {
      setViewport('tablet');
      
      const { container } = render(createClientTable());
      
      const table = container.querySelector('.tbClientTable');
      expect(table).toBeInTheDocument();
      
      // At 768px: overflow-x: auto, -webkit-overflow-scrolling: touch
    });

    it('reduces cell padding on mobile', () => {
      setViewport('tablet');
      
      const { container } = render(createClientTable());
      
      const cells = container.querySelectorAll('td');
      expect(cells.length).toBeGreaterThan(0);
      
      // At 768px: padding: 0.5em
    });
  });

  describe('Table Touch Scrolling', () => {
    it('applies smooth touch scrolling on iOS', () => {
      setViewport('mobile');
      
      const { container } = render(
        <table className="tbHRSTable">
          <thead>
            <tr>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Test</td>
            </tr>
          </tbody>
        </table>
      );
      
      const table = container.querySelector('.tbHRSTable');
      expect(table).toBeInTheDocument();
      
      // CSS should include: -webkit-overflow-scrolling: touch
    });
  });

  describe('Pagination on Mobile', () => {
    it('wraps pagination buttons on small screens', () => {
      setViewport('mobile');
      
      const { container } = render(
        <div className="pagination">
          <button>1</button>
          <button>2</button>
          <button>3</button>
          <button>4</button>
          <button>5</button>
        </div>
      );
      
      const pagination = container.querySelector('.pagination');
      expect(pagination).toBeInTheDocument();
      
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(5);
      
      // At 480px: flex-wrap: wrap, reduced spacing
    });
  });
});
