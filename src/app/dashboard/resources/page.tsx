"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  listDirectory, 
  readFileContent, 
  tempUploadResource, 
  addResource, 
  searchFind,
  getContentAbstract,
  getContentOverview,
  getAccounts,
  getAccountUsers,
  isUnauthenticatedError
} from "@/lib/api/openviking";

interface FSEntry {
  name: string;
  size: number;
  isDir: boolean;
  uri: string;
  abstract?: string;
  score?: number;
}

const fetchDir = async (uri: string, headers?: Record<string, string>) => {
  return await listDirectory(uri, {
    simple: false,
    recursive: false,
    output: 'original',
    abs_limit: 256,
    show_all_hidden: true
  }, headers);
};

const parseBoolean = (val: unknown): boolean => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val.toLowerCase() === 'true';
  return Boolean(val);
};

const normalizeDirUri = (uri: string): string => {
  const trimmed = uri.trim();
  const base = trimmed || "viking://resources";
  return `${base.replace(/\/+$/, "")}/`;
};

const processEntries = (items: Record<string, unknown>[]): FSEntry[] => {
  return items.map((item) => {
    const isDirRaw = item.isDir ?? item.is_dir;
    const isDir = isDirRaw !== undefined 
      ? parseBoolean(isDirRaw) 
      : (item.is_leaf !== undefined ? !parseBoolean(item.is_leaf) : false);
      
    const uri = (item.uri as string) || '';
    return {
      ...(item as unknown as FSEntry),
      isDir,
      name: (item.name as string) || (uri ? uri.split('/').filter(Boolean).pop() || uri : '')
    };
  });
};

function TreeNode({
  entry,
  level = 0,
  currentUri,
  selectedFileUri,
  onSelectDir,
  onSelectFile,
  isSearching,
  headers,
}: {
  entry: FSEntry;
  level: number;
  currentUri: string;
  selectedFileUri: string | null;
  onSelectDir: (uri: string) => void;
  onSelectFile: (entry: FSEntry) => void;
  isSearching: boolean;
  headers?: Record<string, string>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FSEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [abstract, setAbstract] = useState<string | null>(null);

  const isDir = entry.isDir;
  const isSelected = isDir
    ? normalizeDirUri(currentUri) === normalizeDirUri(entry.uri)
    : selectedFileUri === entry.uri;

  const handleExpand = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isDir || isSearching) return;

    if (!isExpanded) {
      setIsExpanded(true);
      if (children === null) {
        setLoading(true);
        try {
          const [dirData, abstractData] = await Promise.allSettled([
            fetchDir(entry.uri, headers),
            getContentAbstract(entry.uri, headers),
            getContentOverview(entry.uri, headers) // We fetch it to align with logs, but might not display it in the tree directly
          ]);
          
          if (dirData.status === "fulfilled" && dirData.value.status === "ok") {
            let items = dirData.value.result || [];
            if (!Array.isArray(items)) {
              if (items.nodes && Array.isArray(items.nodes)) items = items.nodes;
              else if (items.entries && Array.isArray(items.entries)) items = items.entries;
              else items = [];
            }
            setChildren(processEntries(items));
          } else if (dirData.status === "rejected" && (dirData.reason?.message?.includes('404') || dirData.reason?.message?.includes('NOT_FOUND'))) {
            setChildren([]);
          }
          if (abstractData.status === "fulfilled" && abstractData.value.status === "ok") {
            setAbstract(abstractData.value.result);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    } else {
      setIsExpanded(false);
    }
  };

  const handleClick = () => {
    if (isDir) {
      onSelectDir(entry.uri);
      if (!isSearching) {
         handleExpand();
      }
    } else {
      onSelectFile(entry);
    }
  };

  const paddingLeft = `${level * 1.5 + 0.5}rem`;

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        className={`w-full text-left py-1.5 pr-2 flex flex-col hover:bg-gray-200 transition-colors ${
          isSelected ? "bg-blue-100 text-blue-800" : "text-gray-700"
        }`}
        style={{ paddingLeft: isSearching ? '0.5rem' : paddingLeft }}
      >
        <div className="flex items-center w-full">
          {!isSearching && isDir && (
            <span
              className="mr-1 w-4 text-center cursor-pointer text-gray-500 hover:text-gray-700 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
            >
              {loading ? "⏳" : isExpanded ? "▼" : "▶"}
            </span>
          )}
          {!isSearching && !isDir && <span className="mr-1 w-4" />}
          
          <span className="mr-2 text-lg">
            {isDir ? "📁" : "📄"}
          </span>
          <span className="truncate flex-1">{entry.name}</span>
          
          {!isDir && !isSearching && (
            <span className="text-xs text-gray-400 ml-2">
              {(entry.size / 1024).toFixed(1)} KB
            </span>
          )}
          {isSearching && entry.score !== undefined && (
            <span className="text-xs text-blue-500 ml-2">
              Score: {entry.score.toFixed(2)}
            </span>
          )}
        </div>
        
        {(entry.abstract || abstract) && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 w-full pl-6">
            {entry.abstract || abstract}
          </p>
        )}
      </button>
      
      {isExpanded && !isSearching && children && (
        <div className="flex flex-col">
          {children.length === 0 ? (
            <div 
              className="text-xs text-gray-400 py-1"
              style={{ paddingLeft: `${(level + 1) * 1.5 + 0.5}rem` }}
            >
              (空)
            </div>
          ) : (
            children.map((child) => (
              <TreeNode
                key={child.uri}
                entry={child}
                level={level + 1}
                currentUri={currentUri}
                selectedFileUri={selectedFileUri}
                onSelectDir={onSelectDir}
                onSelectFile={onSelectFile}
                isSearching={isSearching}
                headers={headers}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ResourcesPage() {
  const [currentUri, setCurrentUri] = useState("viking://resources");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [entries, setEntries] = useState<FSEntry[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedFile, setSelectedFile] = useState<FSEntry | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorDetails, setUploadErrorDetails] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Record<string, unknown>[]>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("default");
  const [selectedUserId, setSelectedUserId] = useState<string>("admin");
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [apiKeyErrorDetails, setApiKeyErrorDetails] = useState<string | null>(null);

  const handleAuthError = (err: unknown) => {
    if (!isUnauthenticatedError(err)) return false;
    setApiKeyError("API Key 无效或无权限（401 UNAUTHENTICATED / Invalid API Key）");
    setApiKeyErrorDetails(err instanceof Error ? err.message : String(err));
    return true;
  };

  useEffect(() => {
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      try {
        setApiKeyError(null);
        setApiKeyErrorDetails(null);
        const data = await getAccounts();
        if (data.status === "ok") {
          setAccounts(data.result || []);
          setSelectedAccountId((prev) => {
            if (data.result?.length > 0 && prev === "default") {
              return data.result[0].account_id as string;
            }
            return prev;
          });
        }
      } catch (err) {
        if (handleAuthError(err)) {
          setAccounts([]);
          return;
        }
        console.error("Failed to load accounts", err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    loadAccounts();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      if (!selectedAccountId) return;
      try {
        const data = await getAccountUsers(selectedAccountId);
        if (data.status === "ok") {
          setUsers(data.result || []);
          if (data.result?.length > 0) {
            setSelectedUserId(data.result[0].user_id as string);
          } else {
            setSelectedUserId("admin");
          }
        }
      } catch (err) {
        if (handleAuthError(err)) {
          setUsers([]);
          return;
        }
        console.error("Failed to load users", err);
      }
    };
    loadUsers();
  }, [selectedAccountId]);

  const tenantHeaders = {
    'x-test-account': selectedAccountId,
    'x-test-user': selectedUserId
  };

  const fetchRootList = useCallback(async () => {
    setLoadingList(true);
    setIsSearching(false);
    try {
      const data = await fetchDir("viking://resources/", {
        'x-test-account': selectedAccountId,
        'x-test-user': selectedUserId
      });
      if (data.status === "ok") {
        let items = data.result || [];
        // Handle output=original or other non-array responses
        if (!Array.isArray(items)) {
          if (items.nodes && Array.isArray(items.nodes)) {
            items = items.nodes;
          } else if (items.entries && Array.isArray(items.entries)) {
            items = items.entries;
          } else {
            items = [];
          }
        }
        setEntries(processEntries(items));
      }
    } catch (err: unknown) {
      console.error(err);
      if (handleAuthError(err)) {
        setEntries([]);
        return;
      }
      if (err instanceof Error && (err.message.includes('404') || err.message.includes('NOT_FOUND'))) {
        setEntries([]);
      } else {
        alert("Failed to load directory.");
      }
    } finally {
      setLoadingList(false);
    }
  }, [selectedAccountId, selectedUserId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchRootList();
      return;
    }
    
    setLoadingList(true);
    setIsSearching(true);
    try {
      const targetUri = normalizeDirUri(currentUri || "viking://resources");
      const data = await searchFind(searchQuery.trim(), 20, targetUri, tenantHeaders);
      
      let items: Record<string, unknown>[] = [];
      if (Array.isArray(data)) items = data;
      else if (data.result) {
        items = [
          ...(data.result.resources || []),
          ...(data.result.memories || []),
          ...(data.result.skills || [])
        ];
      }
      
      const searchEntries: FSEntry[] = items.map((item: Record<string, unknown>) => {
        const uri = item.uri as string || "";
        const parts = uri.split("/");
        const name = parts[parts.length - 1] || parts[parts.length - 2] || uri;
        
        return {
          name,
          size: 0,
          isDir: item.is_leaf !== undefined ? !parseBoolean(item.is_leaf) : (item.is_dir !== undefined ? parseBoolean(item.is_dir) : false),
          uri,
          abstract: item.abstract as string | undefined,
          score: item.score as number | undefined
        };
      });
      
      setEntries(searchEntries);
    } catch (err: unknown) {
      console.error(err);
      if (handleAuthError(err)) {
        setEntries([]);
        return;
      }
      if (err instanceof Error && (err.message.includes('404') || err.message.includes('NOT_FOUND'))) {
        setEntries([]);
      } else {
        alert("Search failed.");
      }
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!isSearching) {
      fetchRootList();
    }
  }, [isSearching, fetchRootList]);

  const handleSelectFile = async (file: FSEntry) => {
    setSelectedFile(file);
    setLoadingContent(true);
    setFileContent(null);
    try {
      const data = await readFileContent(file.uri, tenantHeaders);
      if (data.status === "ok") {
        setFileContent(data.result);
      } else {
        setFileContent(data.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      if (handleAuthError(err)) {
        setFileContent("API Key 无效或无权限（401 UNAUTHENTICATED / Invalid API Key）");
        return;
      }
      setFileContent("Error loading content.");
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSelectDir = (uri: string) => {
    setCurrentUri(uri.replace(/\/+$/, ""));
    setSelectedFile(null);
    setFileContent(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadErrorDetails(null);
    setUploading(true);
    try {
      const tempData = await tempUploadResource(file, tenantHeaders);
      const tempFileId = tempData.result?.temp_file_id;

      if (!tempFileId) throw new Error("No temp_file_id returned");

      let targetUri = currentUri;
      if (!targetUri.endsWith('/')) {
        targetUri += '/';
      }
      
      // If it's a zip file, upload it to the directory so it unpacks there.
      // Otherwise, upload it as a specific file.
      if (!file.name.toLowerCase().endsWith('.zip')) {
        targetUri += file.name;
      }

      await addResource({
        temp_file_id: tempFileId,
        target: targetUri,
        wait: false,
      }, tenantHeaders);

      // After upload, re-fetch the root list to update the tree.
      if (!isSearching) {
        fetchRootList();
      }
      setIsUploadModalOpen(false); // Close modal on success
    } catch (err) {
      console.error(err);
      if (handleAuthError(err)) return;
      const raw = err instanceof Error ? err.message : String(err);
      const details = `Upload failed: ${raw}`;
      const lower = details.toLowerCase();
      if (lower.includes("failed to acquire point lock") || lower.includes("point lock")) {
        setUploadError("上传失败：目标资源目录正在被占用（锁冲突），请稍后重试。");
      } else if (lower.includes("500") || lower.includes("internal server error")) {
        setUploadError("上传失败：服务端内部错误，请稍后重试或联系管理员。");
      } else {
        setUploadError("上传失败，请稍后重试。");
      }
      setUploadErrorDetails(details);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-4">
      {apiKeyError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md px-4 py-3">
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

      <div className="bg-white shadow rounded-lg h-[calc(100vh-8rem)] flex overflow-hidden">
      {/* Left Panel: File List */}
      <div className="w-1/3 border-r flex flex-col bg-gray-50">
        <div className="p-4 border-b bg-white flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">资源文件</h2>
          <div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
            >
              添加资源
            </button>
          </div>
        </div>

        {/* Tenant Selection */}
        <div className="p-3 border-b bg-gray-50 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">命名空间</span>
            <select 
              className="px-2 py-1 border rounded text-gray-700 bg-white w-2/3"
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setCurrentUri("viking://resources");
                setEntries([]);
                setSelectedFile(null);
                setFileContent(null);
              }}
              disabled={loadingAccounts}
            >
              <option value="default">Default</option>
              {accounts.filter(acc => acc.account_id !== "default").map(acc => (
                <option key={acc.account_id as string} value={acc.account_id as string}>{(acc.name as string) || (acc.account_id as string)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">用户</span>
            <select 
              className="px-2 py-1 border rounded text-gray-700 bg-white w-2/3"
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setCurrentUri("viking://resources");
                setEntries([]);
                setSelectedFile(null);
                setFileContent(null);
              }}
              disabled={!selectedAccountId}
            >
              <option value="admin">Admin</option>
              {users.filter(u => u.user_id !== "admin").map(u => (
                <option key={u.user_id as string} value={u.user_id as string}>{(u.name as string) || (u.user_id as string)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-2 border-b bg-gray-100 flex flex-col gap-2 text-sm text-gray-600 overflow-x-auto">
          <div className="flex items-center">
            <span className="truncate">{currentUri}</span>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder={`在 ${currentUri || 'viking://resources/'} 中检索...`}
              className="flex-1 px-2 py-1 rounded border border-gray-300 focus:outline-none focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              检索
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            <button
              onClick={() => handleSelectDir("viking://resources")}
              className={`w-full text-left py-1.5 pr-2 flex items-center hover:bg-gray-200 transition-colors ${
                normalizeDirUri(currentUri) === normalizeDirUri("viking://resources")
                  ? "bg-blue-100 text-blue-800"
                  : "text-gray-700"
              }`}
              style={{ paddingLeft: "0.5rem" }}
            >
              <span className="mr-2 text-lg">📁</span>
              <span className="truncate flex-1">resources</span>
            </button>

            {loadingList ? (
              <div className="text-center text-gray-500 mt-4">加载中...</div>
            ) : entries.length === 0 ? (
              <div className="text-center text-gray-500 mt-4">空目录</div>
            ) : (
              entries.map((entry) => (
                <TreeNode
                  key={entry.uri}
                  entry={entry}
                  level={0}
                  currentUri={currentUri}
                  selectedFileUri={selectedFile?.uri || null}
                  onSelectDir={handleSelectDir}
                  onSelectFile={handleSelectFile}
                  isSearching={isSearching}
                  headers={tenantHeaders}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: File Preview */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {selectedFile ? (
          <>
            <div className="p-4 border-b flex items-center">
              <span className="text-2xl mr-3">📄</span>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedFile.name}</h3>
                <p className="text-sm text-gray-500">{selectedFile.uri}</p>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
              {loadingContent ? (
                <div className="text-center text-gray-500 mt-10">加载内容中...</div>
              ) : fileContent === null ? (
                <div className="text-center text-gray-500 mt-10">暂无内容</div>
              ) : (
                <div className="bg-white border rounded-lg p-4 shadow-sm h-full overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {fileContent}
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">🗂️</div>
              <p>选择左侧文件查看内容</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">添加资源</h3>
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">当前目标目录：</p>
              <input
                type="text"
                className="w-full bg-gray-100 p-3 rounded text-sm text-gray-800 font-mono border focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={currentUri}
                onChange={(e) => setCurrentUri(e.target.value)}
                onBlur={() => {
                  setCurrentUri((prev) => prev.trim() || "viking://resources");
                }}
                spellCheck={false}
              />
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                请先在左侧资源树中选择目标目录，然后再上传文件。<br />
                注意：如果是 ZIP 压缩包，它将被自动解压到该目录中。
              </p>
            </div>

            {uploadError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-md px-4 py-3">
                <div className="font-semibold">{uploadError}</div>
                {uploadErrorDetails && (
                  <div className="mt-2 text-xs font-mono whitespace-pre-wrap break-words text-red-700">
                    {uploadErrorDetails}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadError(null);
                  setUploadErrorDetails(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={uploading}
              >
                取消
              </button>
              <div className="relative">
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
                >
                  {uploading ? (
                    <>
                      <span className="mr-2 animate-spin">⏳</span> 上传中...
                    </>
                  ) : (
                    "选择并上传文件"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
