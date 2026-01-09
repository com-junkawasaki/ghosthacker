import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('I am on the Story Topology page', async ({ page }) => {
  await page.goto('/');
  // Wait for loader to disappear
  await expect(page.locator('.loader')).not.toBeVisible({ timeout: 15000 });
  // Check for menu trigger as an indicator that UI is ready
  await expect(page.locator('.menu-trigger')).toBeVisible();
});

When('I click on a character node named {string}', async ({ page }, name: string) => {
  console.log(`Searching for node: ${name}`);
  // Use the hidden test buttons for Canvas-based graph
  const node = page.locator('.test-node-btn').filter({ hasText: name }).first();
  await expect(node).toBeAttached({ timeout: 20000 });
  
  await node.click({ force: true });
  console.log(`Clicked test button for node: ${name}`);
  await page.waitForTimeout(1000); // Wait for sidebar to open
});

When('I click on {string}', async ({ page }, buttonText: string) => {
  console.log(`Clicking button: ${buttonText}`);
  const btn = page.getByRole('button', { name: buttonText });
  await expect(btn).toBeAttached({ timeout: 10000 });
  await btn.evaluate(el => {
    el.scrollIntoView({ block: 'center' });
    (el as HTMLElement).click();
  });
  console.log(`Clicked button: ${buttonText}`);
  await page.waitForTimeout(500);
});

Then('I should see the chat overlay', async ({ page }) => {
  await expect(page.locator('.chat-panel')).toBeVisible();
});

When('I type {string} and press Enter', async ({ page }, text: string) => {
  const input = page.getByTestId('chat-input');
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(text);
  await input.press('Enter');
});

Then('I should see my message in the chat history', async ({ page }) => {
  await expect(page.locator('.chat-panel .message.user')).toBeVisible();
});

Then('I should eventually see a response from {string}', async ({ page }, name: string) => {
  // Check for assistant response with speaker name
  // Wait up to 30s for AI response
  const response = page.locator('.message:not(.user)');
  await expect(response.locator('.speaker').last()).toContainText(name, { timeout: 30000 });
  await expect(response.locator('.msg-bubble').last()).not.toBeEmpty();
});
