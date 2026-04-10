"use client";

import { useEffect, useState } from "react";
import { getSystemObserver, isUnauthenticatedError } from "@/lib/api/openviking";
import { parseObserverTable } from "@/lib/utils/observer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const isObserverTable = (str: unknown) => {
  if (typeof str !== 'string') return false;
  const data = parseObserverTable(str);
  return data && data.length > 0;
};

const isMarkdownString = (str: unknown) => {
  if (typeof str !== 'string') return false;
  if (isObserverTable(str)) return false;
  // 检测常见的 Markdown 语法：标题、加粗、代码块、链接、列表、表格
  const markdownRegex = /(^#+\s)|(\*\*.*?\*\*)|(`{1,3}.*?`{1,3})|(\[.*?\]\(.*?\))|(^\s*[-*+]\s)|(^\s*\d+\.\s)|(\|\s*-+\s*\|)/m;
  return markdownRegex.test(str);
};

const isMultilineText = (str: unknown) => {
  return typeof str === 'string' && str.includes('\n');
};

const translateKey = (key: string) => {
  const dict: Record<string, string> = {
    is_healthy: '健康状态',
    errors: '错误信息',
    components: '系统组件',
    queue: '队列',
    vlm: '模型监控',
    models: '模型监控',
    vikingdb: 'VikingDB',
    name: '名称',
    status: '状态',
    message: '信息',
    latency: '延迟',
    initialized: '初始化状态',
    user: '当前用户',
  };
  return dict[key.toLowerCase()] || key;
};

const translateValue = (val: string) => {
  const dict: Record<string, string> = {
    'Queue': '队列',
    'Pending': '待处理',
    'In Progress': '处理中',
    'Processed': '已完成',
    'Errors': '错误数',
    'Total': '总计',
    'Collection': '集合',
    'Index Count': '索引数量',
    'Vector Count': '向量数量',
    'Status': '状态',
    'Model': '模型',
    'Provider': '提供商',
    'Prompt': '提示词',
    'Completion': '补全',
    'Last Updated': '最后更新时间',
    'Embedding': '嵌入向量',
    'Semantic': '语义处理',
    'TOTAL': '总计',
    'OK': '正常'
  };
  return dict[val] || val;
};

const StatusTable = ({ statusStr }: { statusStr: string }) => {
  const data = parseObserverTable(statusStr);
  if (!data || data.length === 0) {
    return (
      <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
        {statusStr}
      </pre>
    );
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
        <thead className="bg-gray-50">
          <tr>
            {headers.map(h => (
              <th key={h} className="px-4 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {translateValue(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, i) => (
            <tr key={i}>
              {headers.map(h => (
                <td key={h} className="px-4 py-1.5 whitespace-nowrap text-sm text-gray-700">
                  {translateValue(row[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function MonitorPage() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const json = await getSystemObserver();
      setData(json);
    } catch (err) {
      if (isUnauthenticatedError(err)) {
        setError("API Key 无效或无权限（401 UNAUTHENTICATED / Invalid API Key）。请检查服务端 OPENVIKING_ROOT_KEY 并重启 Next.js 服务后重试。");
        return;
      }
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
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(String(status))}`}>
        {String(status)}
      </span>
    );
  };

  const observerData: Record<string, unknown> | null = (() => {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;
    const result = obj.result;
    if (result && typeof result === 'object') return result as Record<string, unknown>;
    return obj;
  })();

  const overallBadge = (() => {
    const isHealthy = observerData?.is_healthy;
    if (isHealthy !== undefined) {
      return renderStatusBadge(Boolean(isHealthy) ? 'healthy' : 'error');
    }

    const status = observerData?.status;
    if (typeof status === 'string' && !status.includes('\n')) {
      return renderStatusBadge(status);
    }

    return null;
  })();

  const componentStatusMap: Record<string, unknown> | null = (() => {
    const raw = observerData?.components ?? observerData?.services ?? observerData?.dependencies;
    if (!raw || typeof raw !== 'object') return null;
    return raw as Record<string, unknown>;
  })();

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

      {!!data && (
        <div className="grid grid-cols-1 gap-6">
          {/* 整体状态概览 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">系统整体状态</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">当前系统及各模块健康指标概览</p>
              </div>
              {overallBadge}
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                {Object.entries(observerData || {}).map(([key, value]) => {
                  if (key === "components" || typeof value === "object") return null;
                  
                  const isStatusKey = key.toLowerCase().includes("status");
                  const hasMarkdown = isMarkdownString(value);
                  const isMultiline = isMultilineText(value);
                  const showFullWidth = hasMarkdown || isMultiline;

                  return (
                    <div key={key} className={`py-4 sm:py-5 sm:grid sm:gap-4 sm:px-6 ${showFullWidth ? 'sm:grid-cols-1' : 'sm:grid-cols-3'}`}>
                      <dt className="text-sm font-medium text-gray-500 capitalize">{translateKey(key)}</dt>
                      <dd className={`mt-1 text-sm text-gray-900 sm:mt-0 ${showFullWidth ? '' : 'sm:col-span-2'}`}>
                        {hasMarkdown ? (
                          <div className="mt-2 bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto">
                            <div className="prose prose-sm max-w-none text-gray-700">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {String(value)}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : isMultiline ? (
                          <div className="mt-2 bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto">
                            <StatusTable statusStr={String(value)} />
                          </div>
                        ) : (
                          isStatusKey ? renderStatusBadge(value) : String(value)
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>

          {/* 组件状态列表 */}
          {componentStatusMap && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">组件健康状态</h3>
              </div>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {Object.entries(componentStatusMap).map(([name, info]) => {
                    const infoObj =
                      typeof info === 'object' && info ? (info as Record<string, unknown>) : {};
                    const statusVal = infoObj.status;
                    const messageVal = infoObj.message;
                    const latencyVal = infoObj.latency;
                    const isHealthyVal = infoObj.is_healthy;

                    const hasMarkdown = isMarkdownString(statusVal);
                    const isMultiline = isMultilineText(statusVal);

                    return (
                    <li key={name} className="px-4 py-4 sm:px-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{translateKey(name)}</span>
                          {messageVal !== undefined && messageVal !== null && (
                            <span className="text-sm text-gray-500">{String(messageVal)}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          {latencyVal !== undefined && latencyVal !== null && (
                            <span className="text-sm text-gray-500">{String(latencyVal)}</span>
                          )}
                          {isHealthyVal !== undefined 
                            ? renderStatusBadge(Boolean(isHealthyVal) ? 'healthy' : 'error')
                            : renderStatusBadge(typeof statusVal === 'string' && !statusVal.includes('\n') ? statusVal : 'unknown')}
                        </div>
                      </div>
                      
                      {hasMarkdown ? (
                        <div className="mt-2 bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto">
                          <div className="prose prose-sm max-w-none text-gray-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {String(statusVal)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : isMultiline ? (
                        <div className="mt-2 bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto">
                          <StatusTable statusStr={String(statusVal)} />
                        </div>
                      ) : null}
                    </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
