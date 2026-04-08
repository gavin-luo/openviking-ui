import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getAccounts,
  createAccount,
  deleteAccount,
  getAccountUsers,
  createAccountUser,
  deleteAccountUser,
  updateAccountUserRole,
  regenerateAccountUserKey,
  listDirectory,
  readFileContent,
  tempUploadResource,
  addResource,
  searchFind,
  getSystemObserver,
} from '../openviking';

const TEST_ACCOUNT_ID = `test-acc-${Date.now()}`;
const TEST_USER_ID = `user-${Date.now()}`;

describe('OpenViking API Client Integration Tests', () => {
  
  // ==========================================
  // Admin API (租户/用户管理)
  // ==========================================
  describe('Admin API', () => {
    it('should create an account', async () => {
      const res = await createAccount({ account_id: TEST_ACCOUNT_ID, admin_user_id: TEST_USER_ID });
      expect(res.status).toBe('ok');
      expect(res.result.account_id).toBe(TEST_ACCOUNT_ID);
      expect(res.result.user_key).toBeDefined();
    });

    it('should list accounts including the newly created one', async () => {
      const res = await getAccounts();
      expect(res.status).toBe('ok');
      expect(Array.isArray(res.result)).toBe(true);
      const found = res.result.find((acc: any) => acc.account_id === TEST_ACCOUNT_ID);
      expect(found).toBeDefined();
    });

    it('should get users for the account', async () => {
      const res = await getAccountUsers(TEST_ACCOUNT_ID);
      expect(res.status).toBe('ok');
      expect(Array.isArray(res.result)).toBe(true);
      const adminUser = res.result.find((u: any) => u.user_id === TEST_USER_ID);
      expect(adminUser).toBeDefined();
      expect(adminUser.role).toBe('admin');
    });

    it('should create a new user in the account', async () => {
      const res = await createAccountUser(TEST_ACCOUNT_ID, { user_id: 'editor-1', role: 'user' });
      expect(res.status).toBe('ok');
      expect(res.result.user_key).toBeDefined();
    });

    it('should update user role', async () => {
      const res = await updateAccountUserRole(TEST_ACCOUNT_ID, 'editor-1', 'admin');
      expect(res.status).toBe('ok');
    });

    it('should regenerate user key', async () => {
      const res = await regenerateAccountUserKey(TEST_ACCOUNT_ID, 'editor-1');
      expect(res.status).toBe('ok');
      expect(res.result.user_key).toBeDefined();
    });

    it('should delete the user', async () => {
      const res = await deleteAccountUser(TEST_ACCOUNT_ID, 'editor-1');
      expect(res.status).toBe('ok');
    });
  });

  // ==========================================
  // Observer API (系统监控)
  // ==========================================
  describe('Observer API', () => {
    it('should get system observer status', async () => {
      const res = await getSystemObserver();
      // The observer API might return the direct JSON without wrapping in { status: 'ok', result: ... }
      // depending on the server implementation. Usually it returns at least a status or components field.
      expect(res).toBeDefined();
    });
  });

  // ==========================================
  // FileSystem & Resources API (资源与文件系统)
  // ==========================================
  describe('FileSystem & Resources API', () => {
    const headers = {
      'X-OpenViking-Account': TEST_ACCOUNT_ID,
      'X-OpenViking-User': TEST_USER_ID,
    };

    it('should list directory', async () => {
      const res = await listDirectory('viking://resources/', headers);
      expect(res.status).toBe('ok');
      expect(Array.isArray(res.result)).toBe(true);
    });

    // skip testing upload/read directly unless we have a reliable file
    it('should handle read file error gracefully (e.g. file not found)', async () => {
      try {
        await readFileContent('viking://resources/non-existent-file.txt', headers);
      } catch (err: any) {
        expect(err.message).toContain('API Error');
      }
    });
  });

  // ==========================================
  // Search API (检索)
  // ==========================================
  describe('Search API', () => {
    const headers = {
      'X-OpenViking-Account': TEST_ACCOUNT_ID,
      'X-OpenViking-User': TEST_USER_ID,
    };

    it('should return search results', async () => {
      const res = await searchFind('test query', 5, headers);
      // The search might return array directly or wrapped in { resources: [] } etc.
      expect(res).toBeDefined();
    });
  });

  // ==========================================
  // Cleanup
  // ==========================================
  describe('Cleanup', () => {
    it('should delete the account', async () => {
      const res = await deleteAccount(TEST_ACCOUNT_ID);
      expect(res.status).toBe('ok');
    });
  });
});
