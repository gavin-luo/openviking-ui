import { FullConfig } from '@playwright/test';
import { createAccount } from '../src/lib/api/openviking';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Ensure node env for api requests in setup
process.env.VITEST = 'true';

async function globalSetup(config: FullConfig) {
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const accountId = `test-acc-e2e-${uniqueId}`;
  const userId = `test-user-e2e-${uniqueId}`;
  
  try {
    console.log(`[Global Setup] Creating test account: ${accountId}`);
    const res = await createAccount({ account_id: accountId, admin_user_id: userId });
    if (res.status === 'ok' && res.result.user_key) {
      const authData = {
        apiKey: res.result.user_key,
        accountId: accountId,
        userId: userId,
      };
      const authFilePath = path.join(__dirname, '.test-auth.json');
      fs.writeFileSync(authFilePath, JSON.stringify(authData));
      console.log(`[Global Setup] Successfully created test account and wrote credentials`);
    } else {
      throw new Error(`Failed to create account: ${JSON.stringify(res)}`);
    }
  } catch (error) {
    console.error('[Global Setup] Error creating test account:', error);
    throw error;
  }
}

export default globalSetup;
