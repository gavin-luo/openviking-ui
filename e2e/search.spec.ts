import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

type AuthData = { apiKey: string; accountId: string; userId: string };
let authData: AuthData | null = null;

test.beforeAll(() => {
  const authFilePath = path.join(__dirname, '.test-auth.json');
  if (fs.existsSync(authFilePath)) {
    const parsed = JSON.parse(fs.readFileSync(authFilePath, 'utf-8')) as Partial<AuthData>;
    if (
      parsed &&
      typeof parsed.apiKey === 'string' &&
      typeof parsed.accountId === 'string' &&
      typeof parsed.userId === 'string'
    ) {
      authData = parsed as AuthData;
    }
  }
});

test.describe('Search Center', () => {
  test('should search and return results', async ({ page }) => {
    if (authData) {
      await page.setExtraHTTPHeaders({
        'x-test-api-key': authData.apiKey,
        'x-test-account': authData.accountId,
        'x-test-user': authData.userId,
      });
    }

    // Log console
    page.on('console', msg => console.log('BROWSER:', msg.text()));

    // Navigate directly to Search Center
    await page.goto('/dashboard/search');
    
    // Fill the search query
    await page.fill('input[placeholder*="输入检索内容"]', 'test');
    
    // Click the search button
    await page.click('button:has-text("搜索")');
    
    // Wait for the results to load
    await expect(page.locator('text=搜索中...')).toBeHidden({ timeout: 10000 });
    
    // Check if the results count is visible, it could be 0 or more
    await expect(page.locator('span:has-text("找到")').or(page.locator('h3:has-text("无匹配结果")'))).toBeVisible();
  });
});
