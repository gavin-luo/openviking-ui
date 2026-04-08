import { test, expect } from '@playwright/test';

test.describe('Proxy API Functionality', () => {
  test('should fetch accounts list successfully via proxy', async ({ request }) => {
    // This directly calls the Next.js API route to verify the proxy is working
    const response = await request.get('/api/proxy/admin/accounts');
    
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
    const response = await request.get('/api/proxy/observer/system');
    
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.result).toHaveProperty('is_healthy');
    expect(body.result).toHaveProperty('components');
  });
});
