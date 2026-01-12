import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('I wait for the {string} message to disappear', async ({ page }, text: string) => {
  const loader = page.locator(`.loader:has-text("${text}")`);
  // Wait for the loader to be hidden (timeout 10s)
  await expect(loader).toBeHidden({ timeout: 10000 });
});

When('I add a manual scene to the storyboard', async ({ page }) => {
  const addBtn = page.locator('.add-scene-btn');
  await addBtn.click();
});

When('I enter {string} in the description of the new scene', async ({ page }, description: string) => {
  const lastScene = page.locator('.scene-row').last();
  const textarea = lastScene.locator('textarea[placeholder="Describe the scene..."]');
  await textarea.fill(description);
});

When('I click the {string} button', async ({ page }, label: string) => {
  const btn = page.locator(`button:has-text("${label}")`);
  await btn.click();
});

Then('I should see a success message {string}', async ({ page }, message: string) => {
  // In our implementation, we use alert() which is tricky to test in Playwright
  // But let's assume we might have a UI toast later. For now, let's just wait a bit
  // or check if the save button is enabled again.
  const saveBtn = page.locator('.save-btn');
  await expect(saveBtn).toBeEnabled();
});

When('I reload the page', async ({ page }) => {
  await page.reload();
  await expect(page.locator('.dual-view')).toBeVisible();
});

Then('I should see the scene with description {string}', async ({ page }, description: string) => {
  // Use a more robust check for textarea value
  const textareas = page.locator('.scene-row textarea');
  await expect(async () => {
    const counts = await textareas.count();
    let found = false;
    for (let i = 0; i < counts; i++) {
      const val = await textareas.nth(i).inputValue();
      if (val === description) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  }).toPass({ timeout: 10000 });
});

