"use client";

import { useEffect, useState } from "react";

export default function MonitorPage() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/proxy/observer/system");
      if (!res.ok) {
        throw new Error(`Error: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch system status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // 自动刷新，每10秒更新一次
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    if (!status) return "bg-gray-100 text-gray-800";
    const s = String(status).toLowerCase();
    if (s === "ok" || s === "healthy" || s === "up" || s === "pass") return "bg-green-100 text-green-800";
    if (s === "warn" || s === "warning" || s === "degraded") return "bg-yellow-100 text-yellow-800";
    if (s === "error" || s === "down" || s === "fail" || s === "critical") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const renderStatusBadge = (status: unknown) => {
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}>
        {String(status)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">系统监控面板</h1>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors"
        >
          刷新状态
        </button>
      </div>

      {loading && !data && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">加载系统状态失败: {error}</p>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-6">
          {/* 整体状态概览 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">系统整体状态</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">当前系统及各模块健康指标概览</p>
              </div>
              {(data as Record<string, unknown>).status && renderStatusBadge((data as Record<string, unknown>).status)}
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                {Object.entries(data as Record<string, unknown>).map(([key, value]) => {
                  if (key === "components" || typeof value === "object") return null;
                  return (
                    <div key={key} className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 capitalize">{key}</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {key.toLowerCase().includes("status") ? renderStatusBadge(value) : String(value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>

          {/* 组件状态列表 */}
          {((data as Record<string, unknown>).components || (data as Record<string, unknown>).services || (data as Record<string, unknown>).dependencies) && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">组件健康状态</h3>
              </div>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {Object.entries((data as Record<string, unknown>).components || (data as Record<string, unknown>).services || (data as Record<string, unknown>).dependencies || {}).map(([name, info]: [string, Record<string, unknown>]) => (
                    <li key={name} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{name}</span>
                        {info.message && <span className="text-sm text-gray-500">{info.message}</span>}
                      </div>
                      <div className="flex items-center space-x-4">
                        {info.latency && <span className="text-sm text-gray-500">{info.latency}</span>}
                        {info.status ? renderStatusBadge(info.status) : renderStatusBadge(typeof info === "string" ? info : "Unknown")}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* 兜底：原始JSON展示 (方便调试不可预见的结构) */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
             <h4 className="text-sm font-medium text-gray-700 mb-2">详细诊断信息 (Raw JSON)</h4>
             <pre className="text-xs text-gray-600 overflow-x-auto">
               {JSON.stringify(data, null, 2)}
             </pre>
          </div>
        </div>
      )}
    </div>
  );
}
