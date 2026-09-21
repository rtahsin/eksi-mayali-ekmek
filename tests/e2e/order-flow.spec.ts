import { test, expect } from '@playwright/test';

test('order flow placeholder', async ({ page }) => {
  // Placeholder for order flow E2E. Since we rely on Supabase & Firebase real backends,
  // we won't create junk orders in prod. We just verify the store front loads.
  await page.goto('/');
  await expect(page.locator('text=EkmekLab').first()).toBeVisible();
});
