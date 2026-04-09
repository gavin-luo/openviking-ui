"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { getAccountUsers, createAccountUser, deleteAccountUser, updateAccountUserRole, regenerateAccountUserKey } from "@/lib/api/openviking";

interface User {
  user_id: string;
  role: string;
  user_key?: string;
  api_key?: string;
}

export default function UsersPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const accountId = params.id;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [modalKey, setModalKey] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAccountUsers(accountId);
      if (data.status === "ok") {
        setUsers(data.result || []);
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [accountId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await createAccountUser(accountId, {
        user_id: newUserId,
        role: newUserRole,
      });
      if (data.status === "ok") {
        setModalKey(data.result.user_key);
        fetchUsers();
        setNewUserId("");
        setNewUserRole("user");
      } else {
        alert("注册失败: " + JSON.stringify(data));
      }
    } catch (error) {
      console.error("Failed to create user", error);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm(`确定要移除用户 ${userId} 吗？`)) return;
    try {
      const data = await deleteAccountUser(accountId, userId);
      if (data.status === "ok") {
        fetchUsers();
      } else {
        alert("删除失败: " + JSON.stringify(data));
      }
    } catch (error) {
      console.error("Failed to delete user", error);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!confirm(`确定要将 ${userId} 的角色修改为 ${newRole} 吗？`)) return;
    try {
      const data = await updateAccountUserRole(accountId, userId, newRole);
      if (data.status === "ok") {
        fetchUsers();
      } else {
        alert("修改失败: " + JSON.stringify(data));
      }
    } catch (error) {
      console.error("Failed to change role", error);
    }
  };

  const handleRegenerateKey = async (userId: string) => {
    if (!confirm(`确定要重新生成 ${userId} 的 User Key 吗？旧 Key 将立即失效！`)) return;
    try {
      const data = await regenerateAccountUserKey(accountId, userId);
      if (data.status === "ok") {
        setModalKey(data.result.user_key);
      } else {
        alert("重新生成失败: " + JSON.stringify(data));
      }
    } catch (error) {
      console.error("Failed to regenerate key", error);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) {
      alert("未能获取到该用户的 Key");
      return;
    }
    navigator.clipboard.writeText(text);
    alert("已复制到剪贴板！");
  };

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/accounts" className="text-blue-600 hover:text-blue-900 text-sm">
          &larr; 返回工作区列表
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          工作区 <span className="text-blue-600">{accountId}</span> 的用户管理
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          注册新用户
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
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.user_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => copyToClipboard(user.user_key || user.api_key || "")}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      复制 Key
                    </button>
                    <button
                      onClick={() =>
                        handleChangeRole(user.user_id, user.role === "admin" ? "user" : "admin")
                      }
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      设为 {user.role === "admin" ? "user" : "admin"}
                    </button>
                    <button
                      onClick={() => handleRegenerateKey(user.user_id)}
                      className="text-orange-600 hover:text-orange-900 mr-4"
                    >
                      重置 Key
                    </button>
                    <button
                      onClick={() => handleDelete(user.user_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500 text-sm">
                    暂无用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 创建 / 重置 Key 弹窗 */}
      {(showCreateModal || modalKey) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-black">
              {modalKey ? "操作成功" : "注册新用户"}
            </h2>
            {modalKey ? (
              <div>
                <div className="p-4 bg-green-50 text-green-800 rounded-md mb-4 border border-green-200">
                  <p className="font-bold mb-2">成功生成 User Key！</p>
                  <code className="block p-2 bg-white rounded border break-all text-xs">
                    {modalKey}
                  </code>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => copyToClipboard(modalKey)}
                    className="px-4 py-2 border rounded-md hover:bg-gray-50 text-black"
                  >
                    复制 Key
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setModalKey(null);
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户</label>
                  <input
                    type="text"
                    required
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-black"
                    placeholder="如: user-1"
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-black bg-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
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
                    注册
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
