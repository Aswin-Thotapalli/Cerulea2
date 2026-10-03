import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Every test starts with an empty document.
// A leftover render from the previous test makes a query match twice.
afterEach(() => {
  cleanup();
});
