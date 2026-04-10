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

test.describe('Proxy API Functionality', () => {
  test('should fetch accounts list successfully via proxy', async ({ request }) => {
    // This directly calls the Next.js API route to verify the proxy is working
    const headers = authData ? {
      'x-test-api-key': authData.apiKey,
      'x-test-account': authData.accountId,
      'x-test-user': authData.userId,
    } : undefined;
    
    const response = await request.get('/api/proxy/admin/accounts', { headers });
    
    // Assert that the response is successful (not 500)
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    
    // Assert the shape of the response matches the OpenViking API format
    expect(body.status).toBe('ok');
    expect(Array.isArray(body.result)).toBeTruthy();
    
    if (body.result.length > 0) {
      expect(body.result[0]).toHaveProperty('account_id');
      expect(body.result[0]).toHaveProperty('created_at');
      expect(body.result[0]).toHaveProperty('user_count');
    }
  });

  test('should fetch system observer data successfully via proxy', async ({ request }) => {
    const headers = authData ? {
      'x-test-api-key': authData.apiKey,
      'x-test-account': authData.accountId,
      'x-test-user': authData.userId,
    } : undefined;
    
    const response = await request.get('/api/proxy/observer/system', { headers });
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.result).toHaveProperty('is_healthy');
    expect(body.result).toHaveProperty('components');
  });
});
