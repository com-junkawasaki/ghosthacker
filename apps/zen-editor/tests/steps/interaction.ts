import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('I am on the Story Topology page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Topology Mode' })).toBeVisible();
  // Wait for loader to disappear
  await expect(page.locator('.loader')).not.toBeVisible();
});

When('I click on a character node named {string}', async ({ page }, name: string) => {
  // Wait for the graph to load
  await expect(page.locator('g.node')).not.toHaveCount(0, { timeout: 20000 });
  
  // Find node that has the name in label and contains a person circle
  const nodes = page.locator('g.node').filter({ hasText: name });
  const count = await nodes.count();
  
  let target = nodes.first();
  for (let i = 0; i < count; i++) {
    const n = nodes.nth(i);
    if (await n.locator('circle.person').count() > 0) {
      target = n;
      break;
    }
  }
  
  await target.click({ force: true });
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
  // Wait up to 30s for AI response
  const response = page.locator('.message:not(.user)');
  await expect(response.locator('.speaker').last()).toContainText(name, { timeout: 30000 });
  await expect(response.locator('.msg-bubble').last()).not.toBeEmpty();
});

