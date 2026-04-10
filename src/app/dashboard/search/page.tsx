"use client";

import { useState } from "react";
import { searchFind, searchSearch, isUnauthenticatedError } from "@/lib/api/openviking";

interface SearchResult {
  uri: string;
  score: number;
  abstract: string;
  match_reason?: string;
  [key: string]: unknown;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"find" | "search">("find");
  const [sessionId, setSessionId] = useState("");
  const [targetUri, setTargetUri] = useState("viking://resources");
  const [limit, setLimit] = useState<number | "">(10);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      const limitValue = typeof limit === "number" && limit > 0 ? limit : 10;
      let data;
      if (searchMode === "find") {
        data = await searchFind(query.trim(), limitValue, targetUri.trim() || undefined);
      } else {
        data = await searchSearch(query.trim(), limitValue, sessionId.trim() || undefined, targetUri.trim() || undefined);
      }

      // Assume response is either an array of results or has a `resources` or `data` field
      let items: SearchResult[] = [];
      
      console.log('Search API returned:', data);

      if (Array.isArray(data)) {
        items = data;
      } else if (data.result) {
        // Handle standard API wrapper { status: "ok", result: { ... } }
        const res = data.result;
        // In case result is an array itself
        if (Array.isArray(res)) {
          items = res;
        } else {
          items = [
            ...(res.resources || []),
            ...(res.memories || []),
            ...(res.skills || [])
          ];
        }
      } else {
        // Fallback for direct response
        items = [
          ...(data.resources || []),
          ...(data.memories || []),
          ...(data.skills || []),
          ...(data.data || []),
          ...(data.results || [])
        ];
      }
      
      setResults(items);
    } catch (err) {
      if (isUnauthenticatedError(err)) {
        setError("API Key 无效或无权限（401 UNAUTHENTICATED / Invalid API Key）。请检查服务端 OPENVIKING_ROOT_KEY 并重启 Next.js 服务后重试。");
        setResults([]);
        return;
      }
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">检索测试面板</h1>
          <p className="mt-1 text-sm text-gray-500">测试语义检索 (find) 和带意图分析的检索 (search)，支持自定义返回数量（默认10条）。</p>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg p-6 border border-gray-100">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">检索内容</label>
              <input
                type="text"
                className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                placeholder="输入检索内容，例如: 如何配置多租户？"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">检索模式</label>
              <select
                className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value as "find" | "search")}
              >
                <option value="find">Find (简单语义)</option>
                <option value="search">Search (意图分析)</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">检索范围 (Target URI)</label>
              <input
                type="text"
                className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                placeholder="例如: viking://resources"
                value={targetUri}
                onChange={(e) => setTargetUri(e.target.value)}
              />
            </div>
            <div className="sm:w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">返回数量</label>
              <input
                type="number"
                min="1"
                max="100"
                className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                value={limit}
                onChange={(e) => setLimit(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            {searchMode === "search" && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Session ID (可选)</label>
                <input
                  type="text"
                  className="block w-full px-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                  placeholder="例如: session-123"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex justify-center items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  搜索中...
                </>
              ) : (
                "搜索"
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">检索失败: {error}</p>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-100">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">检索结果</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              找到 {results.length} 条记录
            </span>
          </div>
          <ul className="divide-y divide-gray-200">
            {results.map((item, index) => (
              <li key={item.uri || index} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-indigo-600 truncate mb-1">
                      {item.uri || '未提供 URI'}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {item.abstract || '无摘要内容'}
                    </p>
                    {item.match_reason && (
                      <p className="text-xs text-gray-500 mt-2 bg-gray-100 p-2 rounded">
                        <strong>匹配原因:</strong> {item.match_reason}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0 flex flex-col items-end">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                      Score: {typeof item.score === 'number' ? item.score.toFixed(4) : (item.score || 'N/A')}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !error && results.length === 0 && query && (
         <div className="text-center py-12 bg-white shadow sm:rounded-lg border border-gray-100">
           <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           <h3 className="mt-2 text-sm font-medium text-gray-900">无匹配结果</h3>
           <p className="mt-1 text-sm text-gray-500">没有找到与该查询相关的 resources。</p>
         </div>
      )}
    </div>
  );
}
