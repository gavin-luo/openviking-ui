import React, { useState, useEffect } from 'react';
import { Shield, Plus, X, Save, Check } from 'lucide-react';

interface PermissionEntry {
  entityId: string;
  type: 'user' | 'agent';
  role: 'read' | 'write';
}

export function NodePermissions({ nodeUri }: { nodeUri: string }) {
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [newEntityId, setNewEntityId] = useState('');
  const [newType, setNewType] = useState<'user' | 'agent'>('user');
  const [newRole, setNewRole] = useState<'read' | 'write'>('read');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 初始化加载：从 localStorage 模拟获取当前节点的权限
  useEffect(() => {
    const storageKey = `mock_permissions_${nodeUri}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setPermissions(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored permissions", e);
      }
    } else {
      // 默认给一点模拟数据
      setPermissions([
        { entityId: 'agent-001', type: 'agent', role: 'read' },
        { entityId: 'user-alice', type: 'user', role: 'write' },
      ]);
    }
    setIsLoaded(true);
  }, [nodeUri]);

  const handleAddRule = () => {
    if (!newEntityId.trim()) return;
    
    // Prevent duplicate entity
    if (permissions.some(p => p.entityId === newEntityId.trim() && p.type === newType)) {
      alert("该实体已存在权限规则");
      return;
    }

    setPermissions([
      ...permissions,
      { entityId: newEntityId.trim(), type: newType, role: newRole }
    ]);
    
    setNewEntityId('');
    setIsAdding(false);
  };

  const handleRemoveRule = (idx: number) => {
    const newPerms = [...permissions];
    newPerms.splice(idx, 1);
    setPermissions(newPerms);
  };

  const handleRoleChange = (idx: number, role: 'read' | 'write') => {
    const newPerms = [...permissions];
    newPerms[idx].role = role;
    setPermissions(newPerms);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    // 模拟API请求延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 目前后端尚未提供正式的权限控制 API，暂存在前端 localStorage 中模拟持久化
    const storageKey = `mock_permissions_${nodeUri}`;
    localStorage.setItem(storageKey, JSON.stringify(permissions));
    
    setIsSaving(false);
    setSaveSuccess(true);
    
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  if (!isLoaded) {
    return <div className="p-4 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="p-4 bg-white space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Shield className="w-5 h-5" /> 节点权限设置
        </h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          disabled={isAdding}
        >
          <Plus className="w-4 h-4" /> 添加规则
        </button>
      </div>
      <p className="text-sm text-gray-500 break-all border-b pb-2">目标: {nodeUri}</p>
      
      <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1">
        {permissions.length === 0 && !isAdding && (
          <div className="text-center py-6 text-sm text-gray-400">
            暂无自定义权限规则，该节点继承上级权限
          </div>
        )}

        {permissions.map((p, idx) => (
          <div key={`${p.type}-${p.entityId}`} className="flex justify-between items-center p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${p.type === 'agent' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                {p.type.toUpperCase()}
              </span>
              <span className="font-medium text-sm">{p.entityId}</span>
            </div>
            <div className="flex items-center gap-3">
              <select 
                className="text-sm border-gray-300 rounded px-2 py-1 bg-white focus:ring-blue-500 focus:border-blue-500" 
                value={p.role} 
                onChange={(e) => handleRoleChange(idx, e.target.value as 'read' | 'write')}
              >
                <option value="read">只读 (Read)</option>
                <option value="write">读写 (Write)</option>
              </select>
              <button 
                onClick={() => handleRemoveRule(idx)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="删除规则"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {isAdding && (
          <div className="flex flex-col gap-2 p-3 bg-blue-50 rounded border border-blue-100">
            <div className="flex items-center gap-2">
              <select 
                className="text-sm border-gray-300 rounded px-2 py-1 bg-white"
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'user' | 'agent')}
              >
                <option value="user">USER</option>
                <option value="agent">AGENT</option>
              </select>
              <input 
                type="text" 
                placeholder={`输入 ${newType} ID...`}
                className="text-sm border-gray-300 rounded px-2 py-1 flex-1 focus:ring-blue-500 focus:border-blue-500"
                value={newEntityId}
                onChange={(e) => setNewEntityId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddRule();
                  if (e.key === 'Escape') setIsAdding(false);
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <select 
                className="text-sm border-gray-300 rounded px-2 py-1 bg-white"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'read' | 'write')}
              >
                <option value="read">只读 (Read)</option>
                <option value="write">读写 (Write)</option>
              </select>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="text-xs px-3 py-1 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleAddRule}
                  className="text-xs px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
                  disabled={!newEntityId.trim()}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t flex justify-between items-center">
        <div className="text-sm">
          {saveSuccess && (
            <span className="text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> 保存成功
            </span>
          )}
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving || isAdding}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "保存中..." : "保存更改"}
        </button>
      </div>
    </div>
  );
}
