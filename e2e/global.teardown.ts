import { FullConfig } from '@playwright/test';
import { deleteAccount } from '../src/lib/api/openviking';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Ensure node env for api requests in teardown
process.env.VITEST = 'true';

async function globalTeardown(config: FullConfig) {
  const authFilePath = path.join(__dirname, '.test-auth.json');
  
  if (fs.existsSync(authFilePath)) {
    try {
      const authData = JSON.parse(fs.readFileSync(authFilePath, 'utf-8'));
      console.log(`[Global Teardown] Deleting test account: ${authData.accountId}`);
      
      const res = await deleteAccount(authData.accountId);
      if (res.status === 'ok') {
        console.log(`[Global Teardown] Successfully deleted test account`);
      } else {
        console.error(`[Global Teardown] Failed to delete account: ${JSON.stringify(res)}`);
      }
    } catch (error) {
      console.error('[Global Teardown] Error deleting test account:', error);
    } finally {
      // Clean up the auth file
      fs.unlinkSync(authFilePath);
    }
  } else {
    console.log('[Global Teardown] No test auth data found, skipping account deletion.');
  }
}

export default globalTeardown;
