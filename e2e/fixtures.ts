import { test as base } from '@playwright/test';
import { resetTestDatabase } from './helpers/database';
import { config } from 'dotenv';

// Load environment variables from .env.local for E2E worker
config({ path: '.env.local' });

export type E2EFixtures = {
  // Add any custom fixtures here
};

export const test = base.extend<E2EFixtures>({});

// Global test setup - runs before all tests
test.beforeAll(async () => {
  console.log('🚀 Starting E2E test suite...');
  await resetTestDatabase();
  console.log('🎯 Test database ready');
});

// Global test teardown - runs after all tests
test.afterAll(async () => {
  console.log('🏁 E2E test suite completed');
});

export * from '@playwright/test';
