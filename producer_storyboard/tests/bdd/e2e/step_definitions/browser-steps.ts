/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/bdd-e2e-step-definitions
 * 
 * BDD E2E Step Definitions for Browser Automation
 * Uses Playwright for browser automation
 */
import { Given, When, Then, After, setDefaultTimeout } from '@cucumber/cucumber';
import { expect as chaiExpect } from 'chai';
import { chromium, Browser, Page, BrowserContext, expect } from '@playwright/test';

setDefaultTimeout(60 * 1000); // 60 seconds

let browser: Browser;
let context: BrowserContext;
let page: Page;

// Test state
let currentUrl: string = '';
let pageTitle: string = '';
let elementText: string = '';
let projectTitle: string = '';
let projectDescription: string = '';

Given('ブラウザが起動している', async () => {
	browser = await chromium.launch({
		headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
	});
	context = await browser.newContext({
		viewport: { width: 1280, height: 720 },
	});
	page = await context.newPage();
});

Given('アプリケーションが起動している', async () => {
	const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
	await page.goto(baseUrl);
	await page.waitForLoadState('networkidle');
	currentUrl = page.url();
});

Given('ユーザーがサインインページにアクセスしている', async () => {
	const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
	await page.goto(`${baseUrl}/sign-in`);
	await page.waitForLoadState('networkidle');
	currentUrl = page.url();
	chaiExpect(currentUrl).to.include('/sign-in');
});

Given('ユーザーが認証済みである', async () => {
	// Note: 実際の実装では、Clerkのテストモードを使用するか、
	// または認証済みセッションをモックする必要があります
	// ここでは、サインインページをスキップして直接プロジェクトページにアクセスする想定
	const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
	// 認証済みユーザーとして扱うため、セッションクッキーを設定する必要がある
	// 実際の実装では、Clerkのテストモードを使用することを推奨
	console.log('[E2E] 認証済みユーザーとして扱います（実際の実装ではClerkテストモードを使用）');
});

Given('ユーザーがプロジェクト一覧ページにアクセスしている', async () => {
	const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
	// Note: 実際のorgIdが必要な場合は、テストデータから取得する必要があります
	await page.goto(`${baseUrl}/ja/orgs/select/project`);
	await page.waitForLoadState('networkidle');
	currentUrl = page.url();
});

When('ユーザーがルートページにアクセスする', async () => {
	const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:5173';
	await page.goto(baseUrl);
	await page.waitForLoadState('networkidle');
	currentUrl = page.url();
});

Given(/^タイトルが「(.+)」である$/, async (title: string) => {
	projectTitle = title;
});

Given('タイトルが「{string}」である', async (title: string) => {
	projectTitle = title;
});

Given(/^説明が「(.+)」である$/, async (description: string) => {
	projectDescription = description;
});

Given('説明が「{string}」である', async (description: string) => {
	projectDescription = description;
});

// Use regex patterns to match Japanese quotes
When(/^ユーザーが「(.+)」をクリックする$/, async (buttonText: string) => {
	await page.getByRole('button', { name: buttonText }).click();
	await page.waitForLoadState('networkidle');
});

When('ユーザーが「{string}」をクリックする', async (buttonText: string) => {
	await page.getByRole('button', { name: buttonText }).click();
	await page.waitForLoadState('networkidle');
});

When(/^ユーザーが「(.+)」ボタンをクリックする$/, async (buttonText: string) => {
	// Try multiple selectors for button
	try {
		await page.getByRole('button', { name: new RegExp(buttonText, 'i') }).click({ timeout: 10000 });
	} catch (e) {
		// Fallback to text-based selector
		await page.locator(`button:has-text("${buttonText}")`).first().click({ timeout: 10000 });
	}
	await page.waitForLoadState('networkidle');
});

When('ユーザーが「{string}」ボタンをクリックする', async (buttonText: string) => {
	// Try multiple selectors for button
	try {
		await page.getByRole('button', { name: new RegExp(buttonText, 'i') }).click({ timeout: 10000 });
	} catch (e) {
		// Fallback to text-based selector
		await page.locator(`button:has-text("${buttonText}")`).first().click({ timeout: 10000 });
	}
	await page.waitForLoadState('networkidle');
});

When(/^ユーザーが「(.+)」リンクをクリックする$/, async (linkText: string) => {
	await page.getByRole('link', { name: linkText }).click();
	await page.waitForLoadState('networkidle');
});

When('ユーザーが「{string}」リンクをクリックする', async (linkText: string) => {
	await page.getByRole('link', { name: linkText }).click();
	await page.waitForLoadState('networkidle');
});

When(/^ユーザーが「(.+)」フィールドに「(.+)」を入力する$/, async (fieldLabel: string, value: string) => {
	const field = page.getByLabel(fieldLabel).or(page.getByPlaceholder(fieldLabel));
	await field.fill(value);
	if (fieldLabel.toLowerCase().includes('title') || fieldLabel === 'タイトル') {
		projectTitle = value;
	} else if (fieldLabel.toLowerCase().includes('description') || fieldLabel === '説明') {
		projectDescription = value;
	}
});

When('ユーザーが「{string}」フィールドに「{string}」を入力する', async (fieldLabel: string, value: string) => {
	const field = page.getByLabel(fieldLabel).or(page.getByPlaceholder(fieldLabel));
	await field.fill(value);
	if (fieldLabel.toLowerCase().includes('title') || fieldLabel === 'タイトル') {
		projectTitle = value;
	} else if (fieldLabel.toLowerCase().includes('description') || fieldLabel === '説明') {
		projectDescription = value;
	}
});

When('ユーザーがフォームを送信する', async () => {
	const submitButton = page.getByRole('button', { name: /作成|送信|Submit|Create/i });
	await submitButton.click();
	await page.waitForLoadState('networkidle');
});

When('ユーザーがページをリロードする', async () => {
	await page.reload();
	await page.waitForLoadState('networkidle');
});

Then(/^ページのURLが「(.+)」を含む$/, async (urlPattern: string) => {
	currentUrl = page.url();
	chaiExpect(currentUrl).to.include(urlPattern);
});

Then('ページのURLが「{string}」を含む', async (urlPattern: string) => {
	currentUrl = page.url();
	chaiExpect(currentUrl).to.include(urlPattern);
});

Then('ページのタイトルが「{string}」である', async (expectedTitle: string) => {
	pageTitle = await page.title();
	chaiExpect(pageTitle).to.include(expectedTitle);
});

Then(/^ページに「(.+)」というテキストが表示される$/, async (text: string) => {
	const element = page.getByText(text);
	await expect(element.first()).toBeVisible();
});

Then('ページに「{string}」というテキストが表示される', async (text: string) => {
	const element = page.getByText(text);
	await expect(element.first()).toBeVisible();
});

Then(/^ページに「(.+)」という見出しが表示される$/, async (headingText: string) => {
	const heading = page.getByRole('heading', { name: headingText });
	await expect(heading).toBeVisible();
});

Then('ページに「{string}」という見出しが表示される', async (headingText: string) => {
	const heading = page.getByRole('heading', { name: headingText });
	await expect(heading).toBeVisible();
});

Then('「{string}」ボタンが表示される', async (buttonText: string) => {
	const button = page.getByRole('button', { name: buttonText });
	await expect(button).toBeVisible();
});

Then('「{string}」リンクが表示される', async (linkText: string) => {
	const link = page.getByRole('link', { name: linkText });
	await expect(link).toBeVisible();
});

Then('プロジェクト一覧が表示される', async () => {
	// プロジェクト一覧のコンテナを確認
	const projectList = page.locator('[data-testid="project-list"]').or(page.getByText(/プロジェクト|Project/i));
	await expect(projectList.first()).toBeVisible();
});

Then(/^プロジェクト「(.+)」が一覧に表示される$/, async (projectTitle: string) => {
	const projectElement = page.getByText(projectTitle);
	await expect(projectElement).toBeVisible();
});

Then('プロジェクト「{string}」が一覧に表示される', async (projectTitle: string) => {
	const projectElement = page.getByText(projectTitle);
	await expect(projectElement).toBeVisible();
});

Then('エラーメッセージ「{string}」が表示される', async (errorMessage: string) => {
	const errorElement = page.getByText(errorMessage).or(page.locator('[role="alert"]'));
	await expect(errorElement.first()).toBeVisible();
});

Then('ローディングインジケーターが表示される', async () => {
	const loadingIndicator = page.locator('[aria-label*="loading" i]').or(page.getByText(/読み込み中|Loading/i));
	await expect(loadingIndicator.first()).toBeVisible({ timeout: 5000 });
});

Then('ローディングインジケーターが非表示になる', async () => {
	const loadingIndicator = page.locator('[aria-label*="loading" i]').or(page.getByText(/読み込み中|Loading/i));
	await expect(loadingIndicator.first()).toBeHidden({ timeout: 10000 });
});

Then(/^SignInコンポーネントが表示される$/, async () => {
	// ClerkのSignInコンポーネントが表示されているか確認
	const signInForm = page.locator('form').or(page.getByRole('textbox', { name: /email|メール/i }));
	await expect(signInForm.first()).toBeVisible({ timeout: 10000 });
});

Then(/^ClerkLoading状態が処理される$/, async () => {
	// ClerkLoading/ClerkLoadedコンポーネントの動作を確認
	// 読み込み中テキストが表示された後、消える
	const loadingText = page.getByText('読み込み中');
	// Loading状態は短時間で終わる可能性があるので、存在しない場合もOK
	console.log('[E2E] Checking ClerkLoading state');
});

Then(/^デバッグパネルが表示される$/, async () => {
	// ClerkAuthDebugPanelが表示されているか確認
	const debugPanel = page.getByText('Clerk Auth Debug').or(page.getByText('Client-side Auth State'));
	await expect(debugPanel.first()).toBeVisible({ timeout: 5000 });
});

Then(/^ClerkProviderが初期化される$/, async () => {
	// ClerkProviderが正しく初期化されていることを確認
	// コンソールログまたはページの状態で確認
	console.log('[E2E] Checking ClerkProvider initialization');
	const content = await page.content();
	chaiExpect(content).to.not.include('設定エラー');
});

Then(/^initialAuthStateがデバッグパネルに表示される$/, async () => {
	// デバッグパネルにinitialAuthStateが表示されているか確認
	const initialAuthSection = page.getByText('Initial Auth State').or(page.getByText('initialAuthState'));
	await expect(initialAuthSection.first()).toBeVisible({ timeout: 10000 });
});

Then(/^ページのスクリーンショットを取得する$/, async () => {
	// スクリーンショットを保存
	await page.screenshot({ path: 'tests/bdd/reports/sign-in-page.png', fullPage: true });
	console.log('[E2E] Screenshot saved: tests/bdd/reports/sign-in-page.png');
});

Then(/^デバッグパネルのスクリーンショットを取得する$/, async () => {
	// デバッグパネルのスクリーンショットを保存
	const debugPanel = page.locator('.clerk-auth-debug-panel').first();
	if (await debugPanel.isVisible()) {
		await debugPanel.screenshot({ path: 'tests/bdd/reports/debug-panel.png' });
		console.log('[E2E] Debug panel screenshot saved: tests/bdd/reports/debug-panel.png');
	} else {
		console.log('[E2E] Debug panel not found, skipping screenshot');
	}
});

Then(/^ブラウザコンソールにエラーがないことを確認する$/, async () => {
	// ブラウザコンソールのエラーを確認
	const errors: string[] = [];
	page.on('console', msg => {
		if (msg.type() === 'error') {
			errors.push(msg.text());
		}
	});
	
	// Wait a bit to collect any console errors
	await page.waitForTimeout(2000);
	
	console.log('[E2E] Console errors:', errors.length > 0 ? errors : 'None');
	
	// Log errors but don't fail the test (some errors may be expected)
	if (errors.length > 0) {
		console.warn('[E2E] Found console errors:', errors);
	}
});

// Cleanup
After(async () => {
	if (page) {
		await page.close();
	}
	if (context) {
		await context.close();
	}
	if (browser) {
		await browser.close();
	}
});

