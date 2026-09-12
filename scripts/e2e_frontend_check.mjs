import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8080';
const outDir = path.resolve('artifacts', 'e2e');
fs.mkdirSync(outDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  steps: [],
  errors: [],
};

function logStep(name, status, details = '') {
  report.steps.push({ name, status, details, at: new Date().toISOString() });
  console.log(`[${status}] ${name}${details ? ` - ${details}` : ''}`);
}

async function gotoWithFallback(page, url, contextName) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  } catch (error) {
    const isTimeout = String(error).includes('TimeoutError');
    if (!isTimeout) {
      throw error;
    }

    logStep(
      `Navigation fallback: ${contextName}`,
      'WARN',
      'networkidle timeout, retrying with domcontentloaded',
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
}

async function dismissCookieBanner(page) {
  const strategies = [
    () => page.getByRole('button', { name: /Kabul Et|Accept/i }).first(),
    () => page.locator('button:has-text("Kabul Et")').first(),
    () => page.locator('button').filter({ hasText: /Kabul Et|Accept/i }).first(),
  ];

  for (const getLocator of strategies) {
    try {
      const locator = getLocator();
      if (await locator.count()) {
        await locator.click({ timeout: 2000 });
        await page.waitForTimeout(800);
        logStep('Cookie banner dismissed', 'PASS');
        return true;
      }
    } catch {
      // Try next strategy.
    }
  }

  // Fallback: click where the accept button generally appears in the screenshot.
  try {
    const vp = page.viewportSize();
    if (vp) {
      await page.mouse.click(Math.round(vp.width * 0.35), Math.round(vp.height * 0.91));
      await page.waitForTimeout(700);
      logStep('Cookie banner dismissal fallback click', 'WARN', 'Used coordinate fallback click');
      return true;
    }
  } catch {
    // No-op.
  }

  return false;
}

async function ensureAppReady(page, contextName) {
  await dismissCookieBanner(page);
  await page.waitForTimeout(1500);

  const loaderText = page.getByText('EkmekLab').first();
  if (await loaderText.count()) {
    const visible = await loaderText.isVisible().catch(() => false);
    if (visible) {
      const html = await page.content();
      const htmlPath = path.join(outDir, `debug_${contextName}.html`);
      fs.writeFileSync(htmlPath, html, 'utf8');
      logStep(
        `App readiness check: ${contextName}`,
        'WARN',
        `Loader text still visible; saved debug HTML: ${path.basename(htmlPath)}`,
      );
      return false;
    }
  }

  logStep(`App readiness check: ${contextName}`, 'PASS');
  return true;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    geolocation: { latitude: 41.0082, longitude: 28.9784 },
    permissions: ['geolocation'],
  });

  const page = await context.newPage();

  try {
    // 1) Home load + Light screenshot
    await gotoWithFallback(page, baseUrl, 'home');
    await ensureAppReady(page, 'home');
    await page.screenshot({ path: path.join(outDir, '01-home-light.png'), fullPage: true });
    logStep('Home page loaded (light)', 'PASS');

    // 2) Route-level smoke screenshots on live app
    const routes = ['#/login', '#/register', '#/checkout', '#/orders', '#/preferences'];
    for (const route of routes) {
      await gotoWithFallback(page, `${baseUrl}/${route}`, `route ${route}`);
      const safeRoute = route.replace(/[^a-z0-9]/gi, '_');
      await ensureAppReady(page, `route_${safeRoute}`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, `route_${safeRoute}.png`), fullPage: true });
      logStep(`Route smoke: ${route}`, 'PASS');
    }

    // Return home for interaction attempts
    await gotoWithFallback(page, baseUrl, 'home_interaction');
    await ensureAppReady(page, 'home_interaction');

    // 3) Theme toggle to dark
    const themeBtn = page.getByRole('button', { name: /Karanlık Tema|Aydınlık Tema/i });
    if (await themeBtn.count()) {
      await themeBtn.first().click({ timeout: 10000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(outDir, '02-home-dark.png'), fullPage: true });
      logStep('Theme toggled and dark screenshot captured', 'PASS');
    } else {
      logStep('Theme toggle button found', 'WARN', 'Could not locate theme toggle button via accessible name');
    }

    // 4) Seed cart in localStorage for guest checkout flow
    const seededCart = {
      test_product_1: {
        productId: 'test_product_1',
        quantity: 1,
        productName: 'Test Ekmek',
        productPrice: 95.0,
        productImageUrl: 'https://via.placeholder.com/300x200.png?text=Ekmek',
      },
    };

    await page.evaluate((cartObj) => {
      // shared_preferences_web stores values under flutter.<key> as JSON-encoded values.
      localStorage.setItem('flutter.cart', JSON.stringify(JSON.stringify(cartObj)));
    }, seededCart);
    logStep('Guest cart seeded in localStorage', 'PASS');

    // 5) Go to checkout
    await gotoWithFallback(page, `${baseUrl}/#/checkout`, 'checkout_interaction');
    await ensureAppReady(page, 'checkout_interaction');
    await page.waitForTimeout(1500);

    // 6) Fill mandatory fields when DOM-accessible
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    if (inputCount >= 2) {
      await inputs.nth(0).fill('E2E Test Kullanici');
      await inputs.nth(1).fill('05551234567');
      logStep('Checkout mandatory fields filled', 'PASS');
    } else {
      logStep('Checkout fields interactable', 'WARN', 'Flutter canvas mode prevented direct DOM input access');
    }

    // 7) Open map picker
    const mapButton = page.getByRole('button', { name: /Harita/i }).first();
    if (await mapButton.count()) {
      await mapButton.click();
      await page.waitForTimeout(2000);
      logStep('Map picker opened', 'PASS');

      // Try geolocation FAB first (icon-only; use tooltip/title or generic FAB position)
      const geoFab = page.locator('button[title*="Mevcut Konum"], button[aria-label*="Mevcut Konum"], button').last();
      if (await geoFab.count()) {
        await geoFab.click({ timeout: 5000 }).catch(() => { });
        await page.waitForTimeout(2500);
      }

      // Try selecting point on map canvas as fallback
      const mapCanvas = page.locator('canvas').first();
      if (await mapCanvas.count()) {
        const box = await mapCanvas.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
          await page.waitForTimeout(2000);
        }
      }

      const useLocationBtn = page.getByRole('button', { name: /Bu Konumu Kullan/i });
      if (await useLocationBtn.count()) {
        const disabled = await useLocationBtn.first().isDisabled();
        if (!disabled) {
          await useLocationBtn.first().click();
          await page.waitForTimeout(1200);
          logStep('Map location selected and confirmed', 'PASS');
        } else {
          logStep('Map location confirm button enabled', 'WARN', 'Button remained disabled; location may not have been selected');
          await page.screenshot({ path: path.join(outDir, '03-map-disabled-confirm.png'), fullPage: true });
          // Return back manually
          await page.goBack().catch(() => { });
        }
      } else {
        logStep('Map confirmation button present', 'WARN', 'Could not find "Bu Konumu Kullan"');
      }
    } else {
      logStep('Map button present in checkout', 'WARN', 'Could not find Harita button');
    }

    // 8) Attempt order submission
    const submitBtn = page.getByRole('button', { name: /SİPARİŞİ ONAYLA|SİPARİŞ ALIMI KAPALI/i }).first();
    if (await submitBtn.count()) {
      const label = (await submitBtn.innerText()).trim();
      if (/SİPARİŞ ALIMI KAPALI/i.test(label) || await submitBtn.isDisabled()) {
        logStep('Order submission availability', 'WARN', 'Order intake is closed by business rule (delivery day not open).');
      } else {
        await submitBtn.click();
        await page.waitForTimeout(4000);

        const url = page.url();
        const onOrders = /\/orders|order-history|#\/orders/i.test(url);
        if (onOrders) {
          logStep('Order submitted and redirected', 'PASS', `URL: ${url}`);
        } else {
          // maybe snackbar shown then same page
          const content = await page.content();
          if (/Siparişiniz alındı|Siparişiniz oluşturuluyor|başarı/i.test(content)) {
            logStep('Order submission feedback detected', 'PASS', 'Success message detected in page content');
          } else {
            logStep('Order submission verification', 'WARN', `No clear success redirect/message. URL: ${url}`);
          }
        }
      }
    } else {
      logStep('Order submit button present', 'FAIL', 'Could not find submit button');
    }

    // 9) Screenshot final state
    await page.screenshot({ path: path.join(outDir, '04-final-state.png'), fullPage: true });

  } catch (err) {
    report.errors.push(String(err));
    logStep('E2E execution', 'FAIL', String(err));
  } finally {
    report.finishedAt = new Date().toISOString();
    const reportPath = path.join(outDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`Report saved: ${reportPath}`);
    await context.close();
    await browser.close();
  }
})();
