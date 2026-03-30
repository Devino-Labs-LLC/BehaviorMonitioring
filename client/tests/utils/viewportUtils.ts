/**
 * Viewport Testing Utilities
 * Helper functions for testing responsive behavior at different screen sizes
 */

export type Viewport = 'mobile' | 'tablet' | 'desktop' | 'wide';

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  mobileNav: 950,
  desktop: 1100,
} as const;

export const VIEWPORTS = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  mobileLarge: { width: 414, height: 896 }, // iPhone 11 Pro Max
  tablet: { width: 768, height: 1024 }, // iPad
  tabletLandscape: { width: 1024, height: 768 }, // iPad landscape
  desktop: { width: 1280, height: 720 },
  wide: { width: 1920, height: 1080 },
} as const;

/**
 * Mock window.matchMedia for responsive testing
 * @param width - Viewport width in pixels
 */
export const setViewportWidth = (width: number): void => {
  Object.defineProperty(globalThis.window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });

  // Mock matchMedia for CSS media queries
  Object.defineProperty(globalThis.window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => {
      // Parse media query to extract width
      const maxWidthMatch = /max-width:\s*(\d+)px/.exec(query);
      const minWidthMatch = /min-width:\s*(\d+)px/.exec(query);

      let matches = false;
      if (maxWidthMatch) {
        const maxWidth = Number.parseInt(maxWidthMatch[1], 10);
        matches = width <= maxWidth;
      } else if (minWidthMatch) {
        const minWidth = Number.parseInt(minWidthMatch[1], 10);
        matches = width >= minWidth;
      }

      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
      };
    }),
  });
};

/**
 * Set viewport to predefined size
 * @param viewport - Named viewport size
 */
export const setViewport = (viewport: keyof typeof VIEWPORTS): void => {
  const { width, height } = VIEWPORTS[viewport];
  setViewportWidth(width);
  
  Object.defineProperty(globalThis.window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

/**
 * Check if current viewport matches a breakpoint
 * @param breakpoint - Breakpoint to check
 * @param width - Current width (defaults to window.innerWidth)
 */
export const matchesBreakpoint = (
  breakpoint: keyof typeof BREAKPOINTS,
  width: number = globalThis.window.innerWidth
): boolean => {
  return width <= BREAKPOINTS[breakpoint];
};

/**
 * Test helper to verify element has mobile-appropriate touch target size
 * Minimum 40px height recommended for touch interfaces
 */
export const hasMobileTouchTarget = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.height >= 40;
};

/**
 * Test helper to verify text is readable on mobile
 * Minimum 16px font size prevents iOS zoom
 */
export const hasMobileFontSize = (element: HTMLElement): boolean => {
  const fontSize = globalThis.window.getComputedStyle(element).fontSize;
  const fontSizeValue = Number.parseInt(fontSize, 10);
  return fontSizeValue >= 16;
};

/**
 * Reset viewport to default desktop size
 */
export const resetViewport = (): void => {
  setViewport('desktop');
};
