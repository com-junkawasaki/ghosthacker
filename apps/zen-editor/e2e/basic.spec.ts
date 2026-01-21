import { test, expect } from '@playwright/test';

test.describe('Zen Editor E2E TDD', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
    await page.goto('/');
    // Wait for the app to initialize
    await page.waitForTimeout(3000);
  });

  test('should load graph topology and show node count', async ({ page }) => {
    // Wait for the topology sidebar to load
    const nodeCount = page.locator('aside.sidebar span:has-text("Nodes")');
    await expect(nodeCount).toBeVisible({ timeout: 20000 });
    
    // Log the text content for debugging
    const text = await nodeCount.textContent();
    console.log(`Debug: Node count text found: ${text}`);
    
    const count = parseInt(text?.match(/\d+/)?.[0] || "0");
    expect(count).toBeGreaterThan(0);
  });

  test('should switch to file explorer and open a file', async ({ page }) => {
    // Switch to Files mode
    await page.click('button:has-text("Files")');
    
    // Check if File Explorer header is visible
    await expect(page.locator('span:has-text("Project Files")')).toBeVisible();
    
    // Wait for files to load
    await page.waitForSelector('button.file-item', { timeout: 10000 });
    
    // Log available files
    const files = await page.locator('button.file-item').allTextContents();
    console.log(`Debug: Available files: ${files.join(', ')}`);

    // Click on a file (e.g., manga_script.jsonld)
    const fileItem = page.locator('button.file-item').filter({ hasText: 'manga_script.jsonld' }).first();
    await fileItem.click();
    
    // Verify editor is shown
    const editor = page.locator('.prosemirror-wrapper');
    await expect(editor).toBeVisible({ timeout: 10000 });
    
    // Wait for editor to populate
    await expect(async () => {
      const content = await editor.innerText();
      console.log(`Debug: Editor content length: ${content.length}`);
      expect(content.length).toBeGreaterThan(10);
    }).toPass();
  });

  test('should save changes to a file', async ({ page }) => {
    await page.click('button:has-text("Files")');
    await page.click('button.file-item:has-text("manga_script.jsonld")');
    
    const editor = page.locator('.ProseMirror');
    await editor.click();
    
    // Add some dummy text
    const timestamp = Date.now();
    await page.keyboard.type(`\n\n TDD Test Run: ${timestamp}`);
    
    // Click Save
    await page.click('button.save-btn');
    
    // Verify success alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('saved successfully');
      await dialog.accept();
    });
    
    await expect(page.locator('button.save-btn')).toBeEnabled();
  });
});
