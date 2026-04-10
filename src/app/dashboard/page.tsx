"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSystemObserver } from "@/lib/api/openviking";
import { parseObserverTable } from "@/lib/utils/observer";

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export default function Dashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [refreshHint, setRefreshHint] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);
  const refreshHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTransientHint = useCallback(
    (hint: { type: "info" | "success" | "error"; text: string } | null, durationMs = 2500) => {
      if (refreshHintTimeoutRef.current) clearTimeout(refreshHintTimeoutRef.current);
      setRefreshHint(hint);
      if (!hint) return;
      refreshHintTimeoutRef.current = setTimeout(() => setRefreshHint(null), durationMs);
    },
    [],
  );

  const fetchHealth = useCallback(async (trigger: "auto" | "manual" = "auto") => {
    const isManual = trigger === "manual";
    try {
      if (isManual) {
        setManualRefreshing(true);
        setTransientHint({ type: "info", text: "正在刷新…" });
      }
      setLoading(true);
      setError(null);
      const json = await getSystemObserver();
      setData(json?.result || json);
      const now = Date.now();
      setLastUpdatedAt(now);
      if (isManual) setTransientHint({ type: "success", text: `已更新 ${formatTime(now)}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取系统状态失败");
      if (isManual) setTransientHint({ type: "error", text: "刷新失败，请稍后重试" });
    } finally {
      setLoading(false);
      if (isManual) setManualRefreshing(false);
    }
  }, [setTransientHint]);

  useEffect(() => {
    fetchHealth("auto");
    const interval = setInterval(() => fetchHealth("auto"), 10000);
    return () => {
      clearInterval(interval);
      if (refreshHintTimeoutRef.current) clearTimeout(refreshHintTimeoutRef.current);
    };
  }, [fetchHealth]);

  // 解析各个组件的数据
  const queueData = data?.components?.queue?.status 
    ? parseObserverTable(data.components.queue.status) 
    : [];

  const semanticQueue = queueData.find((q) => q.Queue === "Semantic");
  const embeddingQueue = queueData.find((q) => q.Queue === "Embedding");
  const semanticNodesQueue = queueData.find((q) => q.Queue === "Semantic-Nodes");

  const vikingdbData = data?.components?.vikingdb?.status
    ? parseObserverTable(data.components.vikingdb.status)
    : [];
  const dbContext = vikingdbData.find(db => db.Collection === 'context');

  const vlmStatus = data?.components?.models?.status || data?.components?.vlm?.status;
  const vlmData = vlmStatus
    ? parseObserverTable(vlmStatus)
    : [];

  const retrievalStatus = data?.components?.retrieval?.status || data?.components?.search?.status;
  const retrievalData = retrievalStatus ? parseObserverTable(retrievalStatus) : [];
  const retrievalMetrics = retrievalData.filter(d => d.Metric !== undefined);
  const retrievalContext = retrievalData.filter(d => d['Context Type'] !== undefined);
  
  const getMetric = (name: string) => retrievalMetrics.find(m => m.Metric === name)?.Value || '0';

  const getStatusColor = (status: string | boolean | undefined) => {
    if (status === undefined) return "bg-gray-100 text-gray-800";
    if (typeof status === 'boolean') {
      return status ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
    }
    const s = String(status).toLowerCase();
    if (s === "ok" || s === "healthy" || s === "up" || s === "pass") return "bg-green-100 text-green-800";
    if (s === "warn" || s === "warning" || s === "degraded") return "bg-yellow-100 text-yellow-800";
    if (s === "error" || s === "down" || s === "fail" || s === "critical") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const renderBadge = (text: string, statusColor: string) => (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
      {text}
    </span>
  );

  const renderQueueSection = (title: string, row: Record<string, string> | undefined) => (
    <div>
      <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">{title}</h4>
      <div className="grid grid-cols-5 gap-2 text-center">
        <div className="bg-blue-50 p-2 rounded-md">
          <p className="text-[10px] text-blue-600 mb-1">处理中</p>
          <p className="text-lg font-semibold text-blue-700">{row?.["In Progress"] || "0"}</p>
        </div>
        <div className="bg-yellow-50 p-2 rounded-md">
          <p className="text-[10px] text-yellow-600 mb-1">待处理</p>
          <p className="text-lg font-semibold text-yellow-700">{row?.Pending || "0"}</p>
        </div>
        <div className="bg-green-50 p-2 rounded-md">
          <p className="text-[10px] text-green-600 mb-1">已完成</p>
          <p className="text-lg font-semibold text-green-700">{row?.Processed || "0"}</p>
        </div>
        <div className="bg-red-50 p-2 rounded-md">
          <p className="text-[10px] text-red-600 mb-1">错误数</p>
          <p className="text-lg font-semibold text-red-700">{row?.Errors || "0"}</p>
        </div>
        <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
          <p className="text-[10px] text-gray-600 mb-1">总计</p>
          <p className="text-lg font-semibold text-gray-700">{row?.Total || "0"}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">控制台概览</h1>
        <div className="flex items-center space-x-4">
          {data?.is_healthy !== undefined && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">系统状态:</span>
              {renderBadge(data.is_healthy ? '健康' : '异常', getStatusColor(data.is_healthy))}
            </div>
          )}
          <button
            onClick={() => fetchHealth("manual")}
            disabled={manualRefreshing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {manualRefreshing && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white"></span>
            )}
            {manualRefreshing ? "刷新中…" : "刷新状态"}
          </button>
          <div className="min-w-28 text-right">
            {refreshHint ? (
              <span
                className={[
                  "text-xs font-medium",
                  refreshHint.type === "success"
                    ? "text-green-700"
                    : refreshHint.type === "error"
                      ? "text-red-700"
                      : "text-gray-600",
                ].join(" ")}
              >
                {refreshHint.text}
              </span>
            ) : lastUpdatedAt ? (
              <span className="text-xs text-gray-500">更新于 {formatTime(lastUpdatedAt)}</span>
            ) : null}
          </div>
        </div>
      </div>

      {loading && !data && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">加载系统状态失败: {error}</p>
        </div>
      )}

      {!!data && (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
          
          {/* 队列状态 */}
          <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col break-inside-avoid mb-6">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">队列状态</h3>
              {renderBadge(
                data?.components?.queue?.is_healthy ? '正常' : '异常', 
                getStatusColor(data?.components?.queue?.is_healthy)
              )}
            </div>
            <div className="p-4 flex-1 space-y-6">
              {renderQueueSection("嵌入向量队列", embeddingQueue)}
              {renderQueueSection("语义处理队列", semanticQueue)}
              {renderQueueSection("Semantic-Nodes", semanticNodesQueue)}
            </div>
          </div>

          {/* VikingDB 状态 */}
          <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col break-inside-avoid mb-6">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">向量数据库 (VikingDB)</h3>
              {renderBadge(
                data?.components?.vikingdb?.is_healthy ? '正常' : '异常', 
                getStatusColor(data?.components?.vikingdb?.is_healthy)
              )}
            </div>
            <div className="p-4 flex-1 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-bold text-gray-700 mb-4 text-center">Context 集合</h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">索引数量</p>
                    <p className="text-2xl font-bold text-gray-800">{dbContext?.['Index Count'] || '0'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">向量数量</p>
                    <p className="text-2xl font-bold text-gray-800">{dbContext?.['Vector Count'] || '0'}</p>
                  </div>
                </div>
              </div>
              {vikingdbData.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">所有集合状态</p>
                  <ul className="space-y-2">
                    {vikingdbData.filter(d => d.Collection !== 'TOTAL').map((db, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-700">{db.Collection}</span>
                        {renderBadge(db.Status || '未知', getStatusColor(db.Status))}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 检索状态 */}
          <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col break-inside-avoid mb-6">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-gray-900">检索状态 (Retrieval)</h3>
              {renderBadge(
                (data?.components?.retrieval?.is_healthy ?? data?.components?.search?.is_healthy) ? '正常' : '异常', 
                getStatusColor(data?.components?.retrieval?.is_healthy ?? data?.components?.search?.is_healthy)
              )}
            </div>
            <div className="p-4 flex-1 space-y-6">
              
              {/* 核心指标 */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">检索指标</h4>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-blue-50 p-2 rounded-md">
                    <p className="text-xs text-blue-600 mb-1">总查询数</p>
                    <p className="text-xl font-semibold text-blue-700">{getMetric('Total Queries')}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-md">
                    <p className="text-xs text-green-600 mb-1">总结果数</p>
                    <p className="text-xl font-semibold text-green-700">{getMetric('Total Results')}</p>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded-md">
                    <p className="text-xs text-yellow-600 mb-1">零结果率</p>
                    <p className="text-xl font-semibold text-yellow-700">{getMetric('Zero-Result Rate')}</p>
                  </div>
                  <div className="bg-purple-50 p-2 rounded-md">
                    <p className="text-xs text-purple-600 mb-1">平均延迟</p>
                    <p className="text-xl font-semibold text-purple-700">{getMetric('Avg Latency (ms)')} <span className="text-sm font-normal">ms</span></p>
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                    <p className="text-[10px] text-gray-500 mb-1">平均得分</p>
                    <p className="text-sm font-semibold text-gray-700">{getMetric('Avg Score')}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                    <p className="text-[10px] text-gray-500 mb-1">重排使用</p>
                    <p className="text-sm font-semibold text-gray-700">{getMetric('Rerank Used')}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-md border border-gray-200">
                    <p className="text-[10px] text-gray-500 mb-1">平均结果/查询</p>
                    <p className="text-sm font-semibold text-gray-700">{getMetric('Avg Results/Query')}</p>
                  </div>
                </div>
              </div>

              {/* 上下文类型 */}
              {retrievalContext.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">上下文类型查询分布</h4>
                  <ul className="space-y-2">
                    {retrievalContext.map((ctx, idx) => {
                      const typeMap: Record<string, string> = {
                        'unknown': '未知',
                        'resource': '资源',
                        'memory': '记忆',
                        'skill': '技能'
                      };
                      const typeName = typeMap[ctx['Context Type']] || ctx['Context Type'];
                      return (
                        <li key={idx} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded">
                          <span className="font-medium text-gray-700">{typeName} ({ctx['Context Type']})</span>
                          <span className="font-bold text-indigo-600">{ctx.Queries} 次</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {retrievalMetrics.length === 0 && retrievalContext.length === 0 && (
                <div className="text-center text-gray-500 py-8 text-sm">
                  暂无检索数据
                </div>
              )}
            </div>
          </div>

          {/* VLM 状态 */}
          <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col max-h-[600px] break-inside-avoid mb-6">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-lg leading-6 font-medium text-gray-900">模型监控</h3>
              {renderBadge(
                (data?.components?.models?.is_healthy ?? data?.components?.vlm?.is_healthy) ? '正常' : '异常', 
                getStatusColor(data?.components?.models?.is_healthy ?? data?.components?.vlm?.is_healthy)
              )}
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="space-y-4">
                {vlmData.filter(m => m.Model !== 'TOTAL').map((model, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-bold text-indigo-700 break-all">{model.Model}</h4>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border shadow-sm ml-2 shrink-0">{model.Provider}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mt-3">
                      <div className="bg-white p-1 rounded border border-gray-100">
                        <p className="text-[10px] text-gray-500">提示词</p>
                        <p className="text-sm font-semibold text-gray-800">{model.Prompt || '0'}</p>
                      </div>
                      <div className="bg-white p-1 rounded border border-gray-100">
                        <p className="text-[10px] text-gray-500">补全</p>
                        <p className="text-sm font-semibold text-gray-800">{model.Completion || '0'}</p>
                      </div>
                      <div className="bg-indigo-50 p-1 rounded border border-indigo-100">
                        <p className="text-[10px] text-indigo-500">总消耗</p>
                        <p className="text-sm font-bold text-indigo-700">{model.Total || '0'}</p>
                      </div>
                    </div>
                    {model['Last Updated'] && (
                      <div className="mt-2 text-right">
                        <p className="text-[10px] text-gray-400">最后更新: {model['Last Updated']}</p>
                      </div>
                    )}
                  </div>
                ))}
                {vlmData.length === 0 && (
                  <div className="text-center text-gray-500 py-8 text-sm">
                    暂无模型调用数据
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
