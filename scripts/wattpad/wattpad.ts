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

  // If already logged in, the login page may redirect.
  if (page.url().includes("/home") || page.url().includes("/myworks")) {
    return;
  }

  // Fill email
  const emailSelectors = [
    'input[type="email"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[placeholder*="Email" i]'
  ];
  let filled = false;
  for (const sel of emailSelectors) {
    const el = page.locator(sel);
    if (await el.first().count()) {
      await el.first().fill(email);
      filled = true;
      break;
    }
  }
  if (!filled) throw new Error("Cannot find email input on Wattpad login page");

  // Fill password
  const pwSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="Password" i]'
  ];
  filled = false;
  for (const sel of pwSelectors) {
    const el = page.locator(sel);
    if (await el.first().count()) {
      await el.first().fill(password);
      filled = true;
      break;
    }
  }
  if (!filled) throw new Error("Cannot find password input on Wattpad login page");

  // Submit
  const submit = page.locator('button:has-text("Log in"), button[type="submit"], input[type="submit"]');
  if (await submit.first().count()) {
    await submit.first().click();
  } else {
    await page.keyboard.press("Enter");
  }

  await page.waitForLoadState("networkidle", { timeout: 30000 });
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

export async function openPartEditor(page: Page, index: number) {
  // Try common patterns for the table-of-contents parts list.
  // Click nth part edit; fallback to opening the part and switching to edit.
  const partRow = page.locator('[data-test*="part" i], [data-automation-id*="part" i], li:has(a)');
  const count = await partRow.count();
  if (count === 0) {
    // Fallback: click first link that resembles a chapter
    const links = page.locator('a[href*="/story"], a:has-text("Part")');
    if (await links.count()) {
      await links.nth(index).click();
    }
  } else {
    const target = partRow.nth(index);
    // Prefer an explicit edit button inside the row
    const editBtn = target.locator('a:has-text("Edit"), button:has-text("Edit")');
    if (await editBtn.count()) {
      await editBtn.first().click();
    } else {
      await target.click();
    }
  }
  await page.waitForLoadState("networkidle");
}

export async function setTitleAndBody(page: Page, title: string, body: string) {
  // Title field
  const titleSel = [
    'input[name="title"]',
    'input[placeholder*="Title" i]',
    'textarea[placeholder*="Title" i]'
  ];
  let set = false;
  for (const sel of titleSel) {
    const el = page.locator(sel);
    if (await el.first().count()) {
      await el.first().fill("");
      await el.first().type(title, { delay: 5 });
      set = true;
      break;
    }
  }
  if (!set) {
    // Try role-based
    const tb = page.getByRole("textbox", { name: /title/i });
    if (await tb.count()) {
      await tb.fill("");
      await tb.type(title, { delay: 5 });
      set = true;
    }
  }

  // Body editor (contenteditable)
  const editor = page.locator('[contenteditable="true"]');
  if (await editor.first().count()) {
    await editor.first().click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.press("Backspace");
    await editor.first().type(body, { delay: 1 });
  } else {
    // Fallback to textarea
    const ta = page.locator("textarea");
    if (await ta.first().count()) {
      await ta.first().fill(body);
    }
  }
}

export async function saveAndPublish(page: Page) {
  // Save
  const saveBtn = page.locator('button:has-text("Save"), [data-test*="save" i]');
  if (await saveBtn.first().count()) {
    await saveBtn.first().click();
  }
  // Wait for saved indicator
  await page.waitForTimeout(1500);

  // Publish (if required / present)
  const publishBtn = page.locator('button:has-text("Publish"), [data-test*="publish" i]');
  if (await publishBtn.first().count()) {
    await publishBtn.first().click();
    await page.waitForTimeout(1500);
  }
}

export async function readTitle(page: Page): Promise<string> {
  const titleSel = [
    'input[name="title"]',
    'input[placeholder*="Title" i]',
    'textarea[placeholder*="Title" i]'
  ];
  for (const sel of titleSel) {
    const el = page.locator(sel);
    if (await el.first().count()) {
      return (await el.first().inputValue()).trim();
    }
  }
  const tb = page.getByRole("textbox", { name: /title/i });
  if (await tb.count()) return (await tb.inputValue()).trim();
  return "";
}

export async function readBody(page: Page): Promise<string> {
  const editor = page.locator('[contenteditable="true"]');
  if (await editor.first().count()) {
    return (await editor.first().innerText()).trim();
  }
  const ta = page.locator("textarea");
  if (await ta.first().count()) {
    return (await ta.first().inputValue()).trim();
  }
  return "";
}

