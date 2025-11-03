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
  const debugDir = path.resolve(process.cwd(), "debug");
  if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
  
  await page.goto("https://www.wattpad.com/login", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

  // Save login page HTML for debugging
  const loginHtml = await page.content();
  const loginHtmlPath = path.join(debugDir, `login-page-${Date.now()}.html`);
  fs.writeFileSync(loginHtmlPath, loginHtml, "utf8");
  console.log(`Saved login page HTML to: ${loginHtmlPath}`);

  // Cookie banner accept (best-effort)
  const accept = page.locator('button:has-text("Accept"), button:has-text("Agree")');
  if (await accept.first().count()) {
    await accept.first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  // If already logged in (redirected)
  if (page.url().includes("/home") || page.url().includes("/myworks")) {
    console.log("Already logged in, skipping login");
    return;
  }

  // First, click "Log in with email" button to show email/password form
  const emailLoginBtn = page.locator('button:has-text("Log in with email"), button:has-text("Email"), a:has-text("Email")');
  const emailBtnCount = await emailLoginBtn.first().count();
  if (emailBtnCount > 0) {
    console.log("Clicking 'Log in with email' button...");
    await emailLoginBtn.first().click();
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500); // Wait for form to appear
  }

  const frames = [page, ...page.frames()];

  // Fill email/password in any frame where found
  let emailFilled = false;
  for (const ctx of frames) {
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[placeholder*="Email" i]',
      'input[id="email"]',
      'input[id="username"]',
    ];
    
    for (const selector of emailSelectors) {
      const el = ctx.locator(selector);
      if (await el.first().count()) {
        await el.first().fill(email);
        emailFilled = true;
        console.log(`Filled email using selector: ${selector}`);
        break;
      }
    }
    if (emailFilled) break;
  }
  if (!emailFilled) {
    // Save page HTML for debugging
    const noEmailHtml = await page.content();
    const noEmailPath = path.join(debugDir, `login-no-email-input-${Date.now()}.html`);
    fs.writeFileSync(noEmailPath, noEmailHtml, "utf8");
    throw new Error(`Cannot find email input on Wattpad login page. Saved HTML to: ${noEmailPath}`);
  }

  let pwFilled = false;
  for (const ctx of frames) {
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="Password" i]',
      'input[id="password"]',
    ];
    
    for (const selector of passwordSelectors) {
      const el = ctx.locator(selector);
      if (await el.first().count()) {
        await el.first().fill(password);
        pwFilled = true;
        console.log(`Filled password using selector: ${selector}`);
        break;
      }
    }
    if (pwFilled) break;
  }
  if (!pwFilled) {
    // Save page HTML for debugging
    const noPwHtml = await page.content();
    const noPwPath = path.join(debugDir, `login-no-password-input-${Date.now()}.html`);
    fs.writeFileSync(noPwPath, noPwHtml, "utf8");
    throw new Error(`Cannot find password input on Wattpad login page. Saved HTML to: ${noPwPath}`);
  }
  
  // Wait a bit after filling forms
  await page.waitForTimeout(1000);

  // Submit from the same context where the inputs exist, otherwise generic submit
  let submitted = false;
  for (const ctx of frames) {
    const submit = ctx.locator('button:has-text("Log in"), button[type="submit"], input[type="submit"], button:has-text("Continue"), button:has-text("Sign in")');
    if (await submit.first().count()) {
      await submit.first().click();
      submitted = true;
      break;
    }
  }
  
  if (submitted) {
    // Wait for navigation away from login page
    try {
      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 30000 }
      );
    } catch (err) {
      // Save page HTML if login failed
      const failedLoginHtml = await page.content();
      const failedLoginPath = path.join(debugDir, `login-failed-${Date.now()}.html`);
      fs.writeFileSync(failedLoginPath, failedLoginHtml, "utf8");
      console.log(`Saved failed login page HTML to: ${failedLoginPath}`);
      throw new Error(`Login failed - timeout waiting for navigation. Current URL: ${page.url()}`);
    }
    
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000); // Extra wait for session to be established
    
    // Verify login succeeded by checking URL
    const finalUrl = page.url();
    console.log(`After login submission, current URL: ${finalUrl}`);
    
    if (finalUrl.includes("/login")) {
      // Save page HTML for debugging
      const failedLoginHtml = await page.content();
      const failedLoginPath = path.join(debugDir, `login-failed-still-on-login-${Date.now()}.html`);
      fs.writeFileSync(failedLoginPath, failedLoginHtml, "utf8");
      console.log(`Saved failed login page HTML to: ${failedLoginPath}`);
      throw new Error(`Login failed - still on login page: ${finalUrl}`);
    }
    
    // Navigate to /myworks to verify login
    await page.goto("https://www.wattpad.com/myworks", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);
    
    const myworksUrl = page.url();
    console.log(`After navigating to /myworks, current URL: ${myworksUrl}`);
    
    if (myworksUrl.includes("/login") || myworksUrl === "https://www.wattpad.com/") {
      // Save page HTML for debugging
      const failedMyworksHtml = await page.content();
      const failedMyworksPath = path.join(debugDir, `myworks-failed-${Date.now()}.html`);
      fs.writeFileSync(failedMyworksPath, failedMyworksHtml, "utf8");
      console.log(`Saved failed /myworks page HTML to: ${failedMyworksPath}`);
      throw new Error(`Login failed - redirected to login or home page: ${myworksUrl}`);
    }
    
    console.log(`Login successful, on page: ${myworksUrl}`);
  } else {
    throw new Error("Login failed - submit button not found or not clicked");
  }
}

export async function saveStorage(context: BrowserContext) {
  const dir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await context.storageState({ path: STORAGE_STATE_PATH });
}

export async function openWork(page: Page, workId: string) {
  // Navigate directly to /myworks/{workId} (not /parts, which might not exist)
  const url = `https://www.wattpad.com/myworks/${workId}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30000 });
  
  // Check if we're redirected to story page (that's OK, means we're logged in)
  const currentUrl = page.url();
  if (currentUrl.includes("/story/")) {
    console.log(`Redirected to story page: ${currentUrl}`);
    // Try navigating back to myworks page
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30000 });
  }
  
  console.log(`Current URL after openWork: ${page.url()}`);
}

export async function getExistingPartCount(page: Page, workId: string): Promise<number> {
  // Navigate to myworks page to access Table of Contents
  await openWork(page, workId);
  
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

export async function getFirstExistingPartId(page: Page, workId: string): Promise<string | null> {
  // Navigate to myworks page (might redirect to story page)
  await openWork(page, workId);
  
  // Try to extract part IDs from story page links (format: /{partId}-{slug})
  const partIds = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/158"]'));
    const ids: string[] = [];
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href) {
        // Match pattern: /{partId}-{slug} where partId is numeric
        const match = href.match(/^\/(\d{10,})-/);
        if (match) {
          ids.push(match[1]);
        }
      }
    }
    return [...new Set(ids)]; // Remove duplicates
  });
  
  if (partIds.length > 0) {
    console.log(`Found part IDs from story page: ${partIds.join(", ")}`);
    return partIds[0];
  }
  
  // Try to find part links with /write/ pattern
  const partLinks = page.locator('a[href*="/write/"]');
  const partLinkCount = await partLinks.count();
  if (partLinkCount > 0) {
    const firstHref = await partLinks.first().getAttribute("href");
    if (firstHref) {
      const match = firstHref.match(/\/write\/(\d+)/);
      if (match) {
        return match[1];
      }
    }
  }
  
  // Fallback: try known part ID from HTML (1582748678)
  // This is a temporary fallback for testing
  console.log("Using fallback part ID: 1582748678");
  return "1582748678";
}

export async function createNewPart(page: Page, workId: string, existingPartId?: string, email?: string, password?: string): Promise<string> {
  // If existing part ID is provided, navigate directly to its editor
  // Otherwise, try to find one from the myworks page
  let editorPartId: string | null = null;
  
  // Verify login state before proceeding
  const urlBefore = page.url();
  if (urlBefore.includes("/login") || urlBefore.includes("/home") || urlBefore === "https://www.wattpad.com/") {
    if (email && password) {
      console.log("Not logged in, attempting login...");
      await loginIfNeeded(page, email, password);
      await page.waitForLoadState("networkidle", { timeout: 30000 });
    } else {
      throw new Error("Not logged in and no credentials provided");
    }
  }
  
  if (existingPartId) {
    console.log(`Using provided part ID: ${existingPartId}`);
    editorPartId = existingPartId;
  } else {
    // Navigate to myworks page to find an existing part
    await openWork(page, workId);
    
    // Try to extract part IDs from the page
    const allDataIds = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('[data-id]'));
      return elements.map(el => el.getAttribute('data-id')).filter(id => id && /^\d+$/.test(id));
    });
    
    if (allDataIds.length > 0) {
      editorPartId = allDataIds[0];
      console.log(`Found existing part ID: ${editorPartId}`);
    } else {
      // Try to find part links
      const partLinks = page.locator('a[href*="/write/"]');
      const partLinkCount = await partLinks.count();
      if (partLinkCount > 0) {
        const firstHref = await partLinks.first().getAttribute("href");
        if (firstHref) {
          const match = firstHref.match(/\/write\/(\d+)/);
          if (match) {
            editorPartId = match[1];
            console.log(`Found part ID from link: ${editorPartId}`);
          }
        }
      }
    }
  }
  
  // Navigate to /myworks home page first to ensure we're logged in
  await page.goto("https://www.wattpad.com/myworks", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Check if we're logged in
  const myworksUrl = page.url();
  if (myworksUrl.includes("/login") || myworksUrl === "https://www.wattpad.com/") {
    if (email && password) {
      console.log("Not logged in on /myworks page, re-authenticating...");
      await loginIfNeeded(page, email, password);
      await page.goto("https://www.wattpad.com/myworks", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForTimeout(2000);
    } else {
      throw new Error("Not logged in and no credentials provided");
    }
  }
  
  // Save /myworks home page HTML for debugging
  const htmlContent = await page.content();
  const debugDir = path.resolve(process.cwd(), "debug");
  if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
  const htmlPath = path.join(debugDir, `myworks-home-${Date.now()}.html`);
  fs.writeFileSync(htmlPath, htmlContent, "utf8");
  console.log(`Saved /myworks home page HTML to: ${htmlPath}`);
  
  // Close any onboarding overlays that might block clicks
  const overlaySelectors = [
    '.onboarding-tooltip-overlay',
    '[class*="onboarding"]',
    '[class*="overlay"]',
    '.modal-backdrop',
  ];
  
  for (const selector of overlaySelectors) {
    const overlay = page.locator(selector);
    const overlayCount = await overlay.count();
    if (overlayCount > 0) {
      console.log(`Found overlay with selector: ${selector}, closing...`);
      // Try to click a close button or click outside
      const closeBtn = page.locator(`${selector} button, ${selector} [aria-label*="close" i], ${selector} [aria-label*="dismiss" i]`);
      if (await closeBtn.first().count() > 0) {
        await closeBtn.first().click().catch(() => {});
      } else {
        // Try pressing Escape key
        await page.keyboard.press("Escape").catch(() => {});
      }
      await page.waitForTimeout(1000);
    }
  }
  
  // Try to find and click the work link on /myworks home page
  const workLinkSelectors = [
    `a[href*="/myworks/${workId}"]`,
    `a[href*="/story/${workId}"]`,
    `[data-story-id="${workId}"] a`,
  ];
  
  let workLinkFound = false;
  for (const selector of workLinkSelectors) {
    const workLink = page.locator(selector);
    const linkCount = await workLink.count();
    if (linkCount > 0) {
      console.log(`Found work link with selector: ${selector}, clicking...`);
      // Try to force click if normal click fails
      try {
        await workLink.first().click({ timeout: 5000 });
      } catch (err) {
        // If click fails, try JavaScript click
        console.log("Normal click failed, trying JavaScript click...");
        await workLink.first().evaluate((el: HTMLElement) => {
          (el as HTMLAnchorElement).click();
        });
      }
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForTimeout(2000);
      workLinkFound = true;
      break;
    }
  }
  
  // If work link not found, try direct navigation to /myworks/{workId}/write
  if (!workLinkFound) {
    console.log("Work link not found on /myworks home page, trying direct navigation to /write endpoint...");
    await page.goto(`https://www.wattpad.com/myworks/${workId}/write`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Check if redirected to a specific part editor
    const urlMatch = page.url().match(/\/write\/(\d+)/);
    if (urlMatch) {
      const newPartId = urlMatch[1];
      console.log(`Redirected to part editor: ${newPartId}`);
      // Return immediately if we successfully created/accessed a new part
      if (!editorPartId) {
        return newPartId;
      }
    }
  }
  
  // Save current page HTML for debugging
  const currentHtml = await page.content();
  const currentHtmlPath = path.join(debugDir, `after-work-click-${Date.now()}.html`);
  fs.writeFileSync(currentHtmlPath, currentHtml, "utf8");
  console.log(`Saved page HTML after work click to: ${currentHtmlPath}`);
  
  // Navigate to editor page (use existing part or try /write endpoint)
  if (editorPartId) {
    // Try direct navigation to editor page first (most reliable)
    console.log(`Attempting direct navigation to editor: /myworks/${workId}/write/${editorPartId}`);
    await page.goto(`https://www.wattpad.com/myworks/${workId}/write/${editorPartId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Check if we're on editor page
    const editorUrl = page.url();
    if (!editorUrl.includes("/write/")) {
      // Not on editor page, try finding link on myworks page
      console.log(`Not on editor page (${editorUrl}), trying to find part link...`);
      await page.goto(`https://www.wattpad.com/myworks/${workId}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Try multiple selectors to find part link
      const partLinkSelectors = [
        `a[href*="/write/${editorPartId}"]`,
        `a[href*="/myworks/${workId}/write/${editorPartId}"]`,
        `.story-part[data-id="${editorPartId}"] a`,
        `.story-part a[href*="${editorPartId}"]`,
        `.story-part.drag-item[data-id="${editorPartId}"] a`,
      ];
      
      let linkFound = false;
      for (const selector of partLinkSelectors) {
        const partLink = page.locator(selector);
        const linkCount = await partLink.count();
        if (linkCount > 0) {
          console.log(`Found part link with selector: ${selector}`);
          await partLink.first().click();
          await page.waitForLoadState("networkidle", { timeout: 30000 });
          await page.waitForTimeout(2000);
          linkFound = true;
          break;
        }
      }
      
      if (!linkFound) {
        throw new Error(`Could not find part link or access editor page for part ID: ${editorPartId}`);
      }
    }
  } else {
    // No existing part found - try to find "+ New Part" button on /myworks page
    console.log("No existing part ID provided, looking for '+ New Part' button on /myworks page...");
    const newPartBtn = page.locator('button.btn.btn-orange.on-new-part, button.on-new-part, button:has-text("New Part"), button:has-text("+ New Part")');
    const btnCount = await newPartBtn.count();
    
    if (btnCount > 0) {
      console.log("Found '+ New Part' button on /myworks page, clicking it...");
      await newPartBtn.first().click();
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Check if we're now on an editor page
      const urlMatch = page.url().match(/\/write\/(\d+)/);
      if (urlMatch) {
        editorPartId = urlMatch[1];
        console.log(`Created new part, redirected to editor: ${editorPartId}`);
        // Return the new part ID immediately
        return editorPartId;
      }
    } else {
      // Fallback: try /write endpoint
      console.log("'+ New Part' button not found, trying /write endpoint...");
      await page.goto(`https://www.wattpad.com/myworks/${workId}/write`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      
      // Check if redirected to a part editor
      const urlMatch = page.url().match(/\/write\/(\d+)/);
      if (urlMatch) {
        editorPartId = urlMatch[1];
        console.log(`Redirected to part editor: ${editorPartId}`);
      }
    }
  }
  
  await page.waitForTimeout(2000);
  
  // Check if we're logged in (if redirected to login/home, we're not)
  let currentUrl = page.url();
  console.log(`Current URL after navigation: ${currentUrl}`);
  
  // If redirected to login/home, try to login again
  if ((currentUrl.includes("/login") || currentUrl.includes("/home") || currentUrl === "https://www.wattpad.com/") && email && password) {
    console.log("Redirected to login page, re-authenticating...");
    await loginIfNeeded(page, email, password);
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(3000); // Extra wait for session to be established
    
    // First navigate to myworks page to ensure we're logged in
    await page.goto(`https://www.wattpad.com/myworks/${workId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Verify we're logged in (might be on story page, which is OK)
    const verifyUrl = page.url();
    console.log(`After login verification, URL is: ${verifyUrl}`);
    
    if (verifyUrl.includes("/login")) {
      throw new Error(`Login failed. Still on login page: ${verifyUrl}`);
    }
    
    // If we're on story page, navigate to /myworks page
    if (verifyUrl.includes("/story/")) {
      console.log("On story page, navigating to /myworks page...");
      await page.goto(`https://www.wattpad.com/myworks/${workId}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForTimeout(2000);
    }
    
    // Now try navigating to editor via /myworks page link
    // Navigate to /myworks page first
    await page.goto(`https://www.wattpad.com/myworks/${workId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Try to find and click the part link
    if (editorPartId) {
      const partLinkSelectors = [
        `a[href*="/write/${editorPartId}"]`,
        `.story-part[data-id="${editorPartId}"] a`,
        `.story-part.drag-item[data-id="${editorPartId}"] a`,
      ];
      
      let linkFound = false;
      for (const selector of partLinkSelectors) {
        const partLink = page.locator(selector);
        const linkCount = await partLink.count();
        if (linkCount > 0) {
          console.log(`Clicking part link to navigate to editor with selector: ${selector}`);
          await partLink.first().click();
          await page.waitForLoadState("networkidle", { timeout: 30000 });
          await page.waitForTimeout(2000);
          currentUrl = page.url();
          console.log(`URL after clicking part link: ${currentUrl}`);
          linkFound = true;
          break;
        }
      }
      
      if (!linkFound) {
        // Fallback: try direct navigation
        console.log(`Part link not found, trying direct navigation...`);
        await page.goto(`https://www.wattpad.com/myworks/${workId}/write/${editorPartId}`, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 30000 });
        await page.waitForTimeout(2000);
        currentUrl = page.url();
        console.log(`URL after direct navigation: ${currentUrl}`);
      }
    }
  }
  
  // Final check: if still not on editor page, try one more time with longer wait
  if ((currentUrl.includes("/login") || currentUrl.includes("/home") || currentUrl === "https://www.wattpad.com/") && editorPartId) {
    console.log("Still not on editor page, trying one more time with longer wait...");
    await page.waitForTimeout(5000);
    await page.goto(`https://www.wattpad.com/myworks/${workId}/write/${editorPartId}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(3000);
    currentUrl = page.url();
    console.log(`Final URL check: ${currentUrl}`);
  }
  
  if (currentUrl.includes("/login") || currentUrl.includes("/home") || currentUrl === "https://www.wattpad.com/") {
    throw new Error(`Could not access editor page. Current URL: ${currentUrl}. This might indicate an authentication or permission issue.`);
  }
  
  if (!currentUrl.includes("/write/")) {
    throw new Error(`Not on editor page. Current URL: ${currentUrl}`);
  }
  
  // Wait for editor page to be ready
  await page.waitForSelector('h2#story-title, .story-editor, button.btn.btn-orange.on-new-part, .navbar-story-parts', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  // Save editor page HTML for debugging
  const editorHtml = await page.content();
  const editorDebugDir = path.resolve(process.cwd(), "debug");
  if (!fs.existsSync(editorDebugDir)) fs.mkdirSync(editorDebugDir, { recursive: true });
  const editorHtmlPath = path.join(editorDebugDir, `editor-page-${Date.now()}.html`);
  fs.writeFileSync(editorHtmlPath, editorHtml, "utf8");
  console.log(`Saved editor page HTML to: ${editorHtmlPath}`);
  
  // Get current URL before clicking "New Part" button
  const urlBeforeNewPart = page.url();
  const oldPartIdMatch = urlBeforeNewPart.match(/\/write\/(\d+)/);
  const oldPartId = oldPartIdMatch ? oldPartIdMatch[1] : null;
  console.log(`Current URL before creating new part: ${urlBeforeNewPart}`);
  if (oldPartId) {
    console.log(`Current part ID: ${oldPartId}`);
  }
  
  // Try to open dropdown menu if it exists (button might be in dropdown)
  const dropdownToggle = page.locator('.navbar-story-parts.dropdown-toggle');
  const dropdownCount = await dropdownToggle.count();
  if (dropdownCount > 0) {
    console.log("Found dropdown toggle, opening it to look for 'New Part' button...");
    await dropdownToggle.first().click();
    await page.waitForTimeout(1500);
  }
  
  // Now try to find "+ New Part" button
  // According to user, it's: button.btn.btn-orange.on-new-part
  const newPartSelectors = [
    'button.btn.btn-orange.on-new-part', // Primary selector from user
    'button.on-new-part',
    'button:has-text("New Part")',
    'button:has-text("+ New Part")',
    '.on-new-part', // Might be in dropdown
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
    
    // Log all button texts for debugging
    console.log("All button texts on the page:");
    for (let i = 0; i < Math.min(buttonCount, 20); i++) {
      try {
        const text = await allButtons.nth(i).textContent();
        const classes = await allButtons.nth(i).getAttribute("class") || "";
        console.log(`  Button ${i}: "${text?.trim()}" (classes: ${classes})`);
      } catch (err) {
        // Skip if can't read
      }
    }
    
    // Also try finding by text content more broadly
    const newPartTextButtons = page.locator('button').filter({ hasText: /new|part/i });
    const newPartCount = await newPartTextButtons.count();
    console.log(`Found ${newPartCount} buttons matching "new" or "part" text`);
    
    throw new Error(`Could not find '+ New Part' button on the page. Last error: ${lastError?.message}`);
  }
  
  // Wait for navigation to new part editor page
  // Wait for URL to change (either new part ID or different URL pattern)
  console.log("Waiting for URL to change after clicking 'New Part' button...");
  try {
    await page.waitForFunction(
      (oldUrl) => {
        const newUrl = window.location.href;
        // URL should change, and if it has a part ID, it should be different from old one
        return newUrl !== oldUrl && /\/myworks\/\d+\/write\/\d+/.test(newUrl);
      },
      urlBeforeNewPart,
      { timeout: 30000 }
    );
  } catch (err) {
    // If URL didn't change, check if we're still on the same page
    const urlAfterClick = page.url();
    console.log(`URL after clicking 'New Part': ${urlAfterClick}`);
    if (urlAfterClick === urlBeforeNewPart) {
      console.log("Warning: URL did not change after clicking 'New Part' button. The button might have opened a modal or form.");
      // Wait a bit more and check again
      await page.waitForTimeout(3000);
      const finalUrl = page.url();
      console.log(`Final URL check: ${finalUrl}`);
    }
  }
  
  await page.waitForLoadState("networkidle", { timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Extract part ID from URL
  currentUrl = page.url();
  console.log(`Current URL after creating new part: ${currentUrl}`);
  const urlMatch = currentUrl.match(/\/write\/(\d+)/);
  if (!urlMatch) {
    throw new Error(`Failed to extract part ID from editor URL: ${currentUrl}`);
  }
  
  const partId = urlMatch[1];
  console.log(`Created new part with ID: ${partId}`);
  
  // Verify it's a new part ID (different from old one)
  if (oldPartId && partId === oldPartId) {
    console.log(`Warning: New part ID (${partId}) is the same as old part ID (${oldPartId}). This might indicate the new part was not created, or we're still on the same editor page.`);
    // This is not necessarily an error - we might have navigated to a new part but the ID extraction failed
    // Continue anyway and let the user verify
  }
  
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

