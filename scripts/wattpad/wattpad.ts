import { Browser, BrowserContext, Page, chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

export const STORAGE_STATE_PATH = path.resolve(".auth/wattpad.json");

export async function launchWithStorage() {
  const browser: Browser = await chromium.launch({ headless: true });
  const hasStorage = fs.existsSync(STORAGE_STATE_PATH);
  const context: BrowserContext = hasStorage
    ? await browser.newContext({ storageState: STORAGE_STATE_PATH })
    : await browser.newContext();
  const page = await context.newPage();
  return { browser, context, page };
}

export async function loginIfNeeded(page: Page, email: string, password: string) {
  await page.goto("https://www.wattpad.com/login", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

  // Cookie banner accept (best-effort)
  const accept = page.locator('button:has-text("Accept"), button:has-text("Agree")');
  if (await accept.first().count()) {
    await accept.first().click().catch(() => {});
  }

  // If already logged in (redirected)
  if (page.url().includes("/home") || page.url().includes("/myworks")) return;

  // Some variants show a gateway; try to pick Email login
  const emailLoginBtn = page.locator('button:has-text("Email"), a:has-text("Email")');
  if (await emailLoginBtn.first().count()) {
    await emailLoginBtn.first().click().catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  const frames = [page, ...page.frames()];

  // Fill email/password in any frame where found
  let emailFilled = false;
  for (const ctx of frames) {
    const el = ctx.locator('input[type="email"], input[name="email"], input[name="username"], input[placeholder*="Email" i]');
    if (await el.first().count()) {
      await el.first().fill(email);
      emailFilled = true;
      break;
    }
  }
  if (!emailFilled) throw new Error("Cannot find email input on Wattpad login page");

  let pwFilled = false;
  for (const ctx of frames) {
    const el = ctx.locator('input[type="password"], input[name="password"], input[placeholder*="Password" i]');
    if (await el.first().count()) {
      await el.first().fill(password);
      pwFilled = true;
      break;
    }
  }
  if (!pwFilled) throw new Error("Cannot find password input on Wattpad login page");

  // Submit from the same context where the inputs exist, otherwise generic submit
  for (const ctx of frames) {
    const submit = ctx.locator('button:has-text("Log in"), button[type="submit"], input[type="submit"], button:has-text("Continue"), button:has-text("Sign in")');
    if (await submit.first().count()) {
      await submit.first().click();
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      break;
    }
  }
}

export async function saveStorage(context: BrowserContext) {
  const dir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
}

export async function openWork(page: Page, workId: string) {
  await page.goto(`https://www.wattpad.com/myworks/${workId}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30000 });
}

export async function getExistingPartCount(page: Page, workId: string): Promise<number> {
  // Navigate to myworks page to access Table of Contents
  await page.goto(`https://www.wattpad.com/myworks/${workId}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30000 });
  
  // Extract part IDs from Table of Contents: try multiple selectors
  const partSelectors = [
    '.story-part[data-id]',
    '.story-part.drag-item[data-id]',
    '[data-id]',
    '.parts-list .story-part',
  ];
  
  let count = 0;
  for (const selector of partSelectors) {
    const elements = page.locator(selector);
    const c = await elements.count();
    if (c > 0) {
      count = c;
      break;
    }
  }
  
  console.log(`Found ${count} existing parts on Wattpad`);
  return count;
}

export async function createNewPart(page: Page, workId: string): Promise<string> {
  // Navigate to myworks page if not already there
  if (!page.url().includes(`/myworks/${workId}`)) {
    await page.goto(`https://www.wattpad.com/myworks/${workId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30000 });
  }
  
  // Wait for page to be fully loaded, especially the Table of Contents section
  await page.waitForSelector('.works-item-toc, .parts-list, button', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000); // Extra wait for dynamic content
  
  // Click "+ New Part" button - try multiple selectors
  const newPartSelectors = [
    'button.btn.btn-orange.on-new-part',
    'button.on-new-part',
    'button:has-text("New Part")',
    'button:has-text("+ New Part")',
    '.on-new-part',
    'button.btn-orange',
  ];
  
  let clicked = false;
  let lastError: Error | null = null;
  
  for (const selector of newPartSelectors) {
    try {
      const btn = page.locator(selector);
      const count = await btn.count();
      if (count > 0) {
        await btn.first().waitFor({ state: "visible", timeout: 10000 });
        await btn.first().scrollIntoViewIfNeeded();
        await btn.first().click();
        clicked = true;
        console.log(`Successfully clicked button with selector: ${selector}`);
        break;
      }
    } catch (err) {
      lastError = err as Error;
      // Try next selector
      continue;
    }
  }
  
  if (!clicked) {
    // Debug: try to find any button with "new" or "part" text
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`Found ${buttonCount} buttons on the page`);
    
    // Log button texts for debugging
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const text = await allButtons.nth(i).textContent().catch(() => "");
      if (text && (text.includes("New") || text.includes("Part") || text.includes("+"))) {
        console.log(`Button ${i}: "${text}"`);
      }
    }
    
    throw new Error(`Could not find '+ New Part' button on the page. Last error: ${lastError?.message}`);
  }
  
  // Wait for navigation to new part editor page
  // Wait for URL to contain /write/ followed by digits
  await page.waitForFunction(
    () => /\/myworks\/\d+\/write\/\d+/.test(window.location.href),
    { timeout: 30000 }
  );
  await page.waitForLoadState("networkidle", { timeout: 30000 });
  
  // Extract part ID from URL
  const urlMatch = page.url().match(/\/write\/(\d+)/);
  if (!urlMatch) {
    throw new Error("Failed to extract part ID from editor URL");
  }
  
  const partId = urlMatch[1];
  console.log(`Created new part with ID: ${partId}`);
  
  // Wait for editor to be ready
  await page.waitForSelector('h2#story-title[contenteditable="true"], .story-editor', { timeout: 40000 });
  
  return partId;
}

export async function openPartEditor(page: Page, workId: string, partId: string) {
  await page.goto(`https://www.wattpad.com/myworks/${workId}/write/${partId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('h2#story-title[contenteditable="true"], .story-editor', { timeout: 40000 });
}

export async function setTitleAndBody(page: Page, title: string, body: string) {
  // Title: h2#story-title[contenteditable="true"]
  const titleEl = page.locator('h2#story-title[contenteditable="true"]');
  if (await titleEl.first().count()) {
    await titleEl.first().click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.press("Backspace");
    await titleEl.first().type(title, { delay: 5 });
  }

  // Body: .story-editor (contenteditable div)
  const editor = page.locator('.story-editor[role="textbox"]');
  if (await editor.first().count()) {
    await editor.first().click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.press("Backspace");
    // For contenteditable, set text via evaluate - Wattpad will format it
    await editor.first().evaluate((el, text) => {
      el.textContent = text;
      // Trigger input event so Wattpad recognizes the change
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, body);
  }
}

export async function saveAndPublish(page: Page) {
  // Wait a moment for auto-save
  await page.waitForTimeout(1000);
  
  // Click "Publish Changes" button
  const publishBtn = page.locator('button:has-text("Publish Changes")');
  if (await publishBtn.first().count()) {
    await publishBtn.first().click();
    // Wait for confirmation/toast
    await page.waitForTimeout(2000);
  }
}

export async function readTitle(page: Page): Promise<string> {
  const titleEl = page.locator('h2#story-title[contenteditable="true"]');
  if (await titleEl.first().count()) {
    return (await titleEl.first().innerText()).trim();
  }
  return "";
}

export async function readBody(page: Page): Promise<string> {
  const editor = page.locator('.story-editor[role="textbox"]');
  if (await editor.first().count()) {
    return (await editor.first().innerText()).trim();
  }
  return "";
}

