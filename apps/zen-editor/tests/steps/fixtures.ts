import { test as base, createBdd } from 'playwright-bdd';

export const test = base.extend({
  page: async ({ page }, use) => {
    page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
    page.on('request', request => console.log(`NETWORK REQ: ${request.method()} ${request.url()}`));
    page.on('response', response => console.log(`NETWORK RES: ${response.status()} ${response.url()}`));
    await use(page);
  },
});
export const { Given, When, Then } = createBdd(test);

