import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('I am on the Story Topology page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Topology Mode' })).toBeVisible();
  // Wait for loader to disappear
  await expect(page.locator('.loader')).not.toBeVisible();
});

When('I click on a character node named {string}', async ({ page }, name: string) => {
  // SVG nodes have text labels. Click the circle near the text.
  const nodeText = page.locator('g.node text').filter({ hasText: name });
  await expect(nodeText).toBeVisible({ timeout: 10000 });
  await nodeText.click();
});

When('I click on {string}', async ({ page }, buttonText: string) => {
  await page.getByRole('button', { name: buttonText }).click();
});

Then('I should see the chat overlay', async ({ page }) => {
  await expect(page.locator('.chat-overlay')).toBeVisible();
});

When('I type {string} and press Enter', async ({ page }, text: string) => {
  const input = page.locator('.chat-input-area input');
  await input.fill(text);
  await input.press('Enter');
});

Then('I should see my message in the chat history', async ({ page }) => {
  await expect(page.locator('.message.user')).toBeVisible();
});

Then('I should eventually see a response from {string}', async ({ page }, name: string) => {
  // Check for assistant response with speaker name
  const response = page.locator('.message:not(.user)');
  await expect(response.locator('.speaker')).toContainText(name);
  await expect(response.locator('.msg-bubble')).not.toBeEmpty();
});

