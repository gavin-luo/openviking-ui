"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAccounts, createAccount, deleteAccount, isUnauthenticatedError } from "@/lib/api/openviking";

interface Account {
  account_id: string;
  created_at: string;
  user_count: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccountId, setNewAccountId] = useState("");
  const [newAdminId, setNewAdminId] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeyErrorDetails, setApiKeyErrorDetails] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      setApiKeyError(null);
      setApiKeyErrorDetails(null);
      const data = await getAccounts();
      if (data.status === "ok") {
        setAccounts(data.result || []);
      }
    } catch (error) {
      if (isUnauthenticatedError(error)) {
        setApiKeyError("API Key 无效或无权限（401 UNAUTHENTICATED / Invalid API Key）");
        setApiKeyErrorDetails(error instanceof Error ? error.message : String(error));
        setAccounts([]);
        return;
      }
      console.error("Failed to fetch accounts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await createAccount({
        account_id: newAccountId,
        admin_user_id: newAdminId,
      });
      if (data.status === "ok") {
        setCreatedKey(data.result.user_key);
        fetchAccounts();
        setNewAccountId("");
        setNewAdminId("");
      } else {
        alert("创建失败: " + JSON.stringify(data));
      }
    } catch (error) {
      if (isUnauthenticatedError(error)) {
        setApiKeyError("API Key 无效或无权限（401 UNAUTHENTICATED / Invalid API Key）");
        setApiKeyErrorDetails(error instanceof Error ? error.message : String(error));
        return;
      }
      console.error("Failed to create account", error);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm(`确定要删除工作区 ${accountId} 吗？这会删除所有关联数据！`)) return;
    try {
      const data = await deleteAccount(accountId);
      if (data.status === "ok") {
        fetchAccounts();
      } else {
        alert("删除失败: " + JSON.stringify(data));
      }
    } catch (error) {
      if (isUnauthenticatedError(error)) {
        setApiKeyError("API Key 无效或无权限（401 UNAUTHENTICATED / Invalid API Key）");
        setApiKeyErrorDetails(error instanceof Error ? error.message : String(error));
        return;
      }
      console.error("Failed to delete account", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("已复制到剪贴板！");
  };

  return (
    <div>
      {apiKeyError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 rounded-md px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">{apiKeyError}</div>
              <div className="mt-1 text-sm text-red-700">
                请检查服务端配置的 OPENVIKING_ROOT_KEY 是否正确/有权限，并重启 Next.js 服务后重试。
              </div>
              {apiKeyErrorDetails && (
                <div className="mt-2 text-xs font-mono whitespace-pre-wrap break-words text-red-700">
                  {apiKeyErrorDetails}
                </div>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 text-sm px-2 py-1 rounded border border-red-200 hover:bg-red-100"
              onClick={() => {
                setApiKeyError(null);
                setApiKeyErrorDetails(null);
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">工作区管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          创建工作区
        </button>
      </div>

      {loading ? (
        <div>加载中...</div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.account_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link
                      href={`/dashboard/accounts/${account.account_id}/users`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {account.account_id}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.user_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(account.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/dashboard/accounts/${account.account_id}/users`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      管理用户
                    </Link>
                    <button
                      onClick={() => handleDelete(account.account_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 text-sm">
                    暂无工作区
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 创建 Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-black">创建工作区</h2>
            {createdKey ? (
              <div>
                <div className="p-4 bg-green-50 text-green-800 rounded-md mb-4 border border-green-200">
                  <p className="font-bold mb-2">创建成功！</p>
                  <p className="text-sm mb-1">管理员 User Key:</p>
                  <code className="block p-2 bg-white rounded border break-all text-xs">
                    {createdKey}
                  </code>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => copyToClipboard(createdKey)}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50 text-black"
                  >
                    复制 Key
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatedKey(null);
                    }}
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                  >
                    关闭
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    命名空间
                  </label>
                  <input
                    type="text"
                    required
                    value={newAccountId}
                    onChange={(e) => setNewAccountId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-black"
                    placeholder="如: my-company"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    初始管理员 User ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-black"
                    placeholder="如: admin"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50 text-black"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                  >
                    创建
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
