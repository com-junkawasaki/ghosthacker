import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('I am on the Zen Editor dual page', async ({ page }) => {
  await page.goto('http://localhost:1420/');
  // Wait for the dual view to load with a longer timeout
  await expect(page.locator('.dual-view')).toBeVisible({ timeout: 15000 });
});

When('I locate the node {string} in the graph explorer', async ({ page }, name: string) => {
  const node = page.locator(`.tree-item:has-text("${name}")`);
  await expect(node).toBeVisible();
});

When('I drag the node {string} to the {string} slot of the first scene', async ({ page }, nodeName: string, slotType: string) => {
  const node = page.locator(`.tree-item:has-text("${nodeName}")`);
  const slot = page.locator(`.scene-row`).first().locator(`.entity-slot:has-text("${slotType === 'persons' ? '人物' : slotType}")`);
  
  // Use Playwright drag and drop
  await node.dragTo(slot);
});

Then('I should see a tag {string} in the {string} slot', async ({ page }, tagName: string, slotType: string) => {
  const tag = page.locator(`.tag:has-text("${tagName}")`);
  await expect(tag).toBeVisible();
});

When('I click on the node {string} in the node list', async ({ page }, name: string) => {
  const node = page.locator(`.tree-item:has-text("${name}")`);
  await node.click();
});

Then('I should see the Zen Editor drawer open', async ({ page }) => {
  // Check for right pane content, maybe EntityProfile or Editor
  const pane = page.locator('.pane-content');
  await expect(pane).toBeVisible();
});

Then('the editor title should contain {string}', async ({ page }, title: string) => {
  // If it's EntityProfile, it has <h2>
  const header = page.locator('.pane-content h2');
  await expect(header).toContainText(title);
});
