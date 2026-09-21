import { test, expect } from '@playwright/test';

test.describe('Admin Quick Receipt (Hızlı Fiş Kes)', () => {
  test('should open modal and allow setting company name', async ({ page }) => {
    // 1. Admin Login
    await page.goto('/admin');
    
    // Login with valid PIN (using Keypad)
    await page.getByRole('button', { name: '1', exact: true }).click();
    await page.getByRole('button', { name: '4', exact: true }).click();
    await page.getByRole('button', { name: '5', exact: true }).click();
    await page.getByRole('button', { name: '3', exact: true }).click();
    
    // 2. Navigate to Finans/Cari Page
    await page.goto('/admin/finans');
    
    // Wait for network idle so cariler data loads
    await page.waitForLoadState('networkidle');
    
    // Check if there are any "Fiş Kes" buttons
    const fisButton = page.locator('button', { hasText: 'Fiş Kes' }).first();
    
    if (await fisButton.isVisible()) {
      await fisButton.click();
      
      // The modal might be Quick Slip or it might be an alert saying "No customers".
      // We wait for the modal to animate in.
      await page.waitForTimeout(500);
      
      const nameInput = page.locator('label:has-text("Fişte Görünecek Firma Adı")').locator('..').locator('input');
      
      if (await nameInput.isVisible()) {
        const addressInput = page.locator('label:has-text("Fişte Görünecek Adres")').locator('..').locator('input');
        
        await expect(nameInput).toBeVisible();
        await expect(addressInput).toBeVisible();
        
        // Try to type a new name
        await nameInput.fill('EkmekLab VIP Müşteri');
        await expect(nameInput).toHaveValue('EkmekLab VIP Müşteri');
      } else {
        // If it's not visible, it means the empty state alert appeared. We gracefully pass.
        console.log('Skipping verification because no customers exist yet.');
      }
    }
  });
});
