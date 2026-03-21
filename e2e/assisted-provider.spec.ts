import { test, expect } from '@playwright/test';

test.describe('Assisted Provider Flow', () => {
  test('should display and submit the Phone OTP form', async ({ page }) => {
    // Intercept Supabase Auth API calls
    await page.route('**/auth/v1/otp', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: "OTP sent" })
      });
    });

    await page.route('**/auth/v1/verify', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          access_token: 'mock-token',
          user: { id: 'test-provider-id', phone: '+40712345678' } 
        })
      });
    });

    // We don't have the server running automatically in playwright,
    // wait! the user runs 'npm run dev' or we run 'npm run preview' if there is a webServer config.
    // I should create a vite preview instead of full playwright webServer if it's missing.
    // For now, assume process.env.BASE_URL is 'http://localhost:5173' or we navigate to '/'
    await page.goto('http://localhost:5173/#/auth');
    
    // Find the telephone tab and click it
    const phoneTab = page.locator('button[role="tab"]', { hasText: 'Telefon' });
    await expect(phoneTab).toBeVisible({ timeout: 10000 });
    await phoneTab.click();

    // Fill phone number
    const phoneInput = page.locator('input#login-phone');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill('0712345678');

    // Click submit code
    const submitBtn = page.locator('button', { hasText: 'Trimite cod SMS' });
    await submitBtn.click();

    // Verify OTP input appears
    const otpInput = page.locator('input#login-otp');
    await expect(otpInput).toBeVisible();
    await otpInput.fill('123456');

    // Submit Verify Code
    const verifyBtn = page.locator('button', { hasText: 'Verifică codul' });
    await verifyBtn.click();

    // Wait for auth to trigger (in the UI at least it won't crash)
    // The test only intends to verify the UI states are correct.
    await expect(page.locator('text=Cod invalid sau expirat')).not.toBeVisible();
  });
});
