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

test.describe('Resource Center', () => {
  test('should navigate to resources, upload and read file', async ({ page }) => {
    if (authData) {
      await page.setExtraHTTPHeaders({
        'x-test-api-key': authData.apiKey,
        'x-test-account': authData.accountId,
        'x-test-user': authData.userId,
      });
    }

    // Log console errors and dialogs
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('dialog', dialog => console.log('BROWSER DIALOG:', dialog.message()));

    // Go directly to Resource Center
    await page.goto('/dashboard/resources');
    
    // Wait for the directory list to load
    await expect(page.locator('text=空目录').or(page.locator('ul.space-y-1'))).toBeVisible();

    // 3. Upload a file
    const testFileName = `test-e2e-${Date.now()}.txt`;
    const testFilePath = path.join(__dirname, testFileName);
    fs.writeFileSync(testFilePath, 'Hello from E2E ' + Date.now());

    // Click "添加资源" to open the upload modal
    await page.click('button:has-text("添加资源")');
    await expect(page.locator('text=当前目标目录：')).toBeVisible();

    // Playwright sets input files
    await page.setInputFiles('input[type="file"]', testFilePath);
    
    // Wait until uploading text is gone and modal is closed
    await expect(page.locator('button:has-text("选择并上传文件")')).toBeHidden({ timeout: 10000 });
    
    // 4. Verify file appears in list
    const fileLocator = page.locator(`text=${testFileName}`);
    
    // Retry reloading until the file appears, as the server processes uploads asynchronously
    await expect(async () => {
      await page.reload();
      // Need to re-inject headers after reload in some Playwright versions just to be safe
      if (authData) {
        await page.setExtraHTTPHeaders({
          'x-test-api-key': authData.apiKey,
          'x-test-account': authData.accountId,
          'x-test-user': authData.userId,
        });
      }
      await expect(fileLocator).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    
    // 5. Click the file to read content
    await fileLocator.click();
    
    // Wait for content
    await expect(page.locator('pre')).toContainText('Hello from E2E', { timeout: 10000 });
    
    // Cleanup local file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // Cleanup remote file
    if (authData) {
      await page.request.delete(`/api/proxy/fs?uri=viking://resources/${testFileName}&recursive=true`, {
        headers: {
          'x-test-api-key': authData.apiKey,
          'x-test-account': authData.accountId,
          'x-test-user': authData.userId,
        }
      });
    }
  });
});

