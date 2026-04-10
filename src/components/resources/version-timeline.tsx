import React from 'react';
import { Clock, RotateCcw } from 'lucide-react';

interface Version {
  id: string;
  timestamp: string;
  message: string;
  author: string;
}

const mockVersions: Version[] = [
  { id: 'v3', timestamp: '2023-10-27 14:30', message: '更新了产品文档', author: 'admin' },
  { id: 'v2', timestamp: '2023-10-26 10:15', message: '修复错别字', author: 'user1' },
  { id: 'v1', timestamp: '2023-10-25 09:00', message: '初始提交', author: 'admin' },
];

export function VersionTimeline({ resourceUri }: { resourceUri: string }) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Clock className="w-5 h-5" /> 历史版本
        </h3>
      </div>
      <p className="text-sm text-gray-500 break-all mb-4">目标: {resourceUri}</p>
      
      <div className="relative border-l border-gray-200 ml-3 space-y-6 pb-4">
        {mockVersions.map((v) => (
          <div key={v.id} className="mb-6 ml-6">
            <span className="absolute flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full -left-3 ring-8 ring-white">
               <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </span>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-gray-900">{v.message}</h4>
                <p className="text-sm text-gray-500">{v.timestamp} by {v.author}</p>
              </div>
              <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                <RotateCcw className="w-4 h-4" /> 回滚至此版本
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
