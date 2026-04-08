import { test, expect } from '@playwright/test';

test.describe('Authentication and Navigation', () => {
  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/dashboard/accounts');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('login page has expected elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toHaveText('Sign in to your account');
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
  });

  test('shows error on invalid login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill('invalid@example.com');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // It should show an error message. Wait for it to appear.
    // The exact error message depends on Supabase, but there should be a text-red-500 element.
    await expect(page.locator('.text-red-500')).toBeVisible({ timeout: 10000 });
  });
});
