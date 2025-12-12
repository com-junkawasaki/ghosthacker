/**
 * Global setup for Playwright E2E tests with Clerk authentication
 * Based on https://clerk.com/docs/guides/development/testing/playwright/overview
 */
import { clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';

setup.describe.configure({ mode: 'serial' });

setup('global setup', async () => {
	console.log('[E2E Global Setup] Setting up Clerk testing environment...');
	await clerkSetup();
	console.log('[E2E Global Setup] Clerk setup completed');
});
