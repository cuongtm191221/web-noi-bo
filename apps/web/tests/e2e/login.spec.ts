import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/documents');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in with valid admin credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@rikkei.edu.vn');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/documents/);
    await expect(page.locator('h1')).toContainText('Tài liệu');
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@rikkei.edu.vn');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Email hoặc mật khẩu không đúng')).toBeVisible();
  });
});
