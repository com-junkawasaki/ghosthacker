import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('I am on the Story Topology page', async ({ page }) => {
  await page.goto('/');
});

When('I click on a character node named {string}', async ({ page }, name: string) => {
  // skip
});

When('I click on {string}', async ({ page }, buttonText: string) => {
  // skip
});

Then('I should see the chat overlay', async ({ page }) => {
  // skip
});

When('I type {string} and press Enter', async ({ page }, text: string) => {
  // skip
});

Then('I should see my message in the chat history', async ({ page }) => {
  // skip
});

Then('I should eventually see a response from {string}', async ({ page }, name: string) => {
  // skip
});
