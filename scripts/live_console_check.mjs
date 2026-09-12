import { chromium } from 'playwright';

const targetUrl = process.env.TARGET_URL || 'https://eksimayaliekmekweb.web.app';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const logs = [];

page.on('console', (msg) => {
  logs.push(`[console:${msg.type()}] ${msg.text()}`);
});

page.on('pageerror', (err) => {
  logs.push(`[pageerror] ${err.message}`);
  if (err.stack) {
    logs.push(`[pageerror:stack] ${err.stack}`);
  }
});

page.on('requestfailed', (req) => {
  logs.push(`[requestfailed] ${req.url()} :: ${req.failure()?.errorText || 'unknown'}`);
});

try {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(7000);

  const title = await page.title();
  const bodyText = await page.locator('body').innerText();

  console.log(`TITLE: ${title}`);
  console.log(`BODY_SNIPPET: ${bodyText.slice(0, 500).replace(/\s+/g, ' ')}`);
  console.log(logs.length ? logs.join('\n') : 'NO_BROWSER_ERRORS');
} finally {
  await browser.close();
}
