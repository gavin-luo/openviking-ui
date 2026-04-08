"use client";

import { useState, useEffect, useRef } from "react";

interface FSEntry {
  name: string;
  size: number;
  isDir: boolean;
  uri: string;
}

export default function ResourcesPage() {
  const [currentUri, setCurrentUri] = useState("viking://resources/");
  const [entries, setEntries] = useState<FSEntry[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedFile, setSelectedFile] = useState<FSEntry | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchList = async (uri: string) => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/proxy/fs/ls?uri=${encodeURIComponent(uri)}`);
      if (!res.ok) throw new Error("Failed to fetch directory");
      const data = await res.json();
      if (data.status === "ok") {
        setEntries(data.result || []);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load directory.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchList(currentUri);
  }, [currentUri]);

  const fetchContent = async (file: FSEntry) => {
    setSelectedFile(file);
    setLoadingContent(true);
    setFileContent(null);
    try {
      const res = await fetch(`/api/proxy/content/read?uri=${encodeURIComponent(file.uri)}`);
      if (!res.ok) throw new Error("Failed to read file");
      const data = await res.json();
      if (data.status === "ok") {
        setFileContent(data.result);
      } else {
        setFileContent(data.error || "Unknown error");
      }
    } catch (err) {
      console.error(err);
      setFileContent("Error loading content.");
    } finally {
      setLoadingContent(false);
    }
  };

  const handleEntryClick = (entry: FSEntry) => {
    if (entry.isDir) {
      setCurrentUri(entry.uri);
      setSelectedFile(null);
      setFileContent(null);
    } else {
      fetchContent(entry);
    }
  };

  const handleGoUp = () => {
    if (currentUri === "viking://resources/") return;
    // Remove the trailing slash, then split by '/'
    const withoutTrailing = currentUri.endsWith("/") ? currentUri.slice(0, -1) : currentUri;
    const parts = withoutTrailing.split("/");
    parts.pop(); // remove the last folder
    let newUri = parts.join("/") + "/";
    
    // ensure it's at least viking://resources/
    if (!newUri.startsWith("viking://resources/")) {
      newUri = "viking://resources/";
    }
    setCurrentUri(newUri);
    setSelectedFile(null);
    setFileContent(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Temp upload
      const formData = new FormData();
      formData.append("file", file);

      const tempRes = await fetch("/api/proxy/resources/temp_upload", {
        method: "POST",
        body: formData,
      });
      if (!tempRes.ok) throw new Error("Temp upload failed");
      const tempData = await tempRes.json();
      const tempFileId = tempData.result?.temp_file_id;

      if (!tempFileId) throw new Error("No temp_file_id returned");

      // 2. Add resource
      const addRes = await fetch("/api/proxy/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temp_file_id: tempFileId,
          target: currentUri,
          wait: true,
        }),
      });

      if (!addRes.ok) throw new Error("Failed to add resource");
      
      // Refresh list
      fetchList(currentUri);
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="bg-white shadow rounded-lg h-[calc(100vh-8rem)] flex overflow-hidden">
      {/* Left Panel: File List */}
      <div className="w-1/3 border-r flex flex-col bg-gray-50">
        <div className="p-4 border-b bg-white flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">资源文件</h2>
          <div>
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              onClick={handleUploadClick}
              disabled={uploading}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "上传中..." : "上传文件"}
            </button>
          </div>
        </div>

        <div className="p-2 border-b bg-gray-100 flex items-center text-sm text-gray-600 overflow-x-auto">
          {currentUri !== "viking://resources/" && (
            <button
              onClick={handleGoUp}
              className="mr-2 px-2 py-1 bg-white border rounded hover:bg-gray-50 flex-shrink-0"
            >
              &uarr; 返回上级
            </button>
          )}
          <span className="truncate">{currentUri}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingList ? (
            <div className="text-center text-gray-500 mt-4">加载中...</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-gray-500 mt-4">空目录</div>
          ) : (
            <ul className="space-y-1">
              {entries.map((entry) => (
                <li key={entry.uri}>
                  <button
                    onClick={() => handleEntryClick(entry)}
                    className={`w-full text-left px-3 py-2 rounded flex items-center hover:bg-gray-200 transition-colors ${
                      selectedFile?.uri === entry.uri ? "bg-blue-100 text-blue-800" : "text-gray-700"
                    }`}
                  >
                    <span className="mr-2 text-lg">
                      {entry.isDir ? "📁" : "📄"}
                    </span>
                    <span className="truncate flex-1">{entry.name}</span>
                    {!entry.isDir && (
                      <span className="text-xs text-gray-400 ml-2">
                        {(entry.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
    </div>
  );
}
