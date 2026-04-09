/**
 * API Client for interacting with the OpenViking Server via Next.js Proxy
 */

const isTest = typeof process !== 'undefined' && process.env.VITEST;
const isServer = typeof window === 'undefined' || isTest;

// For server-side (tests), we bypass the Next.js proxy and hit the OpenViking API directly
const getBaseUrl = () => {
  if (isServer) {
    let url = process.env.OPENVIKING_API_URL || 'http://127.0.0.1:1933/api/v1/';
    if (!url.endsWith('/')) {
      url += '/';
    }
    // ensure it ends with /api/v1/ if not already (e.g. if env only has http://host:port/)
    if (!url.includes('api/v1')) {
      url += 'api/v1/';
    }
    return url;
  }
  return '/api/proxy/';
};

const getHeaders = (customHeaders?: HeadersInit) => {
  const headers: Record<string, string> = {
    ...((customHeaders as Record<string, string>) || {})
  };
  
  if (isServer) {
    if (process.env.OPENVIKING_ROOT_KEY) {
      headers['X-API-Key'] = process.env.OPENVIKING_ROOT_KEY;
    }
  }
  
  return headers;
};

/**
 * Helper to handle fetch responses and throw errors for non-ok status
 */
async function fetchApi(url: string, options: RequestInit = {}) {
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  const target = `${getBaseUrl()}${cleanUrl}`;
  
  const res = await fetch(target, {
    ...options,
    headers: getHeaders(options.headers)
  });
  
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`API Error: ${res.status} ${res.statusText} ${errText}`);
  }
  return res.json();
}

// ==========================================
// Admin API (租户/用户管理)
// ==========================================

export async function getAccounts() {
  return fetchApi('/admin/accounts');
}

export async function createAccount(data: { account_id: string; admin_user_id: string }) {
  return fetchApi('/admin/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(accountId: string) {
  return fetchApi(`/admin/accounts/${accountId}`, {
    method: 'DELETE',
  });
}

export async function getAccountUsers(accountId: string) {
  return fetchApi(`/admin/accounts/${accountId}/users`);
}

export async function createAccountUser(accountId: string, data: { user_id: string; role?: string; metadata?: any }) {
  return fetchApi(`/admin/accounts/${accountId}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteAccountUser(accountId: string, userId: string) {
  return fetchApi(`/admin/accounts/${accountId}/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function updateAccountUserRole(accountId: string, userId: string, role: string) {
  return fetchApi(`/admin/accounts/${accountId}/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
}

export async function regenerateAccountUserKey(accountId: string, userId: string) {
  return fetchApi(`/admin/accounts/${accountId}/users/${userId}/key`, {
    method: 'POST',
  });
}

// ==========================================
// FileSystem & Resources API (资源与文件系统)
// ==========================================

export async function listDirectory(uri: string, options?: { simple?: boolean; recursive?: boolean; output?: string; abs_limit?: number; show_all_hidden?: boolean; node_limit?: number }, headers?: Record<string, string>) {
  const queryParams = new URLSearchParams({ uri });
  if (options) {
    if (options.simple !== undefined) queryParams.append('simple', String(options.simple));
    if (options.recursive !== undefined) queryParams.append('recursive', String(options.recursive));
    if (options.output !== undefined) queryParams.append('output', options.output);
    if (options.abs_limit !== undefined) queryParams.append('abs_limit', String(options.abs_limit));
    if (options.show_all_hidden !== undefined) queryParams.append('show_all_hidden', String(options.show_all_hidden));
    if (options.node_limit !== undefined) queryParams.append('node_limit', String(options.node_limit));
  }
  return fetchApi(`/fs/ls?${queryParams.toString()}`, { headers });
}

export async function readFileContent(uri: string, headers?: Record<string, string>) {
  return fetchApi(`/content/read?uri=${encodeURIComponent(uri)}`, { headers });
}

export async function getContentOverview(uri: string, headers?: Record<string, string>) {
  return fetchApi(`/content/overview?uri=${encodeURIComponent(uri)}`, { headers });
}

export async function getContentAbstract(uri: string, headers?: Record<string, string>) {
  return fetchApi(`/content/abstract?uri=${encodeURIComponent(uri)}`, { headers });
}

export async function tempUploadResource(file: File, headers?: Record<string, string>) {
  const formData = new FormData();
  formData.append('file', file);
  return fetchApi('/resources/temp_upload', {
    method: 'POST',
    body: formData,
    headers,
  });
}

export async function addResource(data: { temp_file_id: string; target: string; wait?: boolean }, headers?: Record<string, string>) {
  // The server API uses 'to' instead of 'target' in the request body
  const payload = {
    temp_file_id: data.temp_file_id,
    to: data.target,
    wait: data.wait,
  };
  return fetchApi('/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
}

// ==========================================
// Search API (检索)
// ==========================================

export async function searchFind(query: string, limit: number = 10, targetUri?: string, headers?: Record<string, string>) {
  return fetchApi('/search/find', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ query, limit, target_uri: targetUri }),
  });
}

export async function searchSearch(query: string, limit: number = 10, sessionId?: string, targetUri?: string, headers?: Record<string, string>) {
  return fetchApi('/search/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ query, limit, session_id: sessionId, target_uri: targetUri }),
  });
}

// ==========================================
// Observer API (系统监控)
// ==========================================

export async function getSystemObserver() {
  return fetchApi('/observer/system');
}
