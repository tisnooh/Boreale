import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// next/image utilise le loader d'optimisation Next — en test jsdom, on remplace par un <img> simple.
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { fill: _fill, sizes: _sizes, priority: _priority, ...rest } = props;
    return React.createElement('img', rest);
  },
}));
