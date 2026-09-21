import { test, expect } from '@playwright/test';

test('admin login with valid pin', async ({ page }) => {
  await page.goto('/admin');
  
  // Use keypad to enter PIN: 1453
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: '4', exact: true }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: '3', exact: true }).click();
  
  // Should navigate to /admin/siparisler/bugun or see Siparişler
  await expect(page).toHaveURL(/.*\/admin\/.*/);
  // Expect standard EkmekLab branding
  await expect(page.locator('text=EkmekLab')).toBeVisible();
});

test('admin login with invalid pin', async ({ page }) => {
  await page.goto('/admin');
  
  const btn0 = page.getByRole('button', { name: '0', exact: true });
  await btn0.click();
  await btn0.click();
  await btn0.click();
  await btn0.click();
  
  // Should show error message
  await expect(page.locator('text=Hatalı PIN!')).toBeVisible();
});
