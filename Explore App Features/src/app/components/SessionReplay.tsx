import { useState } from 'react';
import { Plus, SlidersHorizontal, Link2, ChevronDown, LayoutGrid } from 'lucide-react';

export function SessionReplay() {
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const [showBy, setShowBy] = useState('Sessions');

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-gray-900">Session Replay</h1>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Link2 className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 mb-6">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <LayoutGrid className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-700">All</span>
        </button>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
          </svg>
          <span className="text-sm text-gray-700">Dec 28, 2025 - Jan 3, 2026 (7 days)</span>
        </button>

        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm text-gray-700">All users</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All replays
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'favorites'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            Favorites
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Plus className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Filter by page</span>
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <SlidersHorizontal className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Filters</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Show by</span>
            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm text-gray-700">{showBy}</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <button className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <LayoutGrid className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No replays available</h3>
        <p className="text-gray-600 mb-1">The filters don't match any sessions. Try broadening your filters.</p>
        <p className="text-gray-600">You can also increase your traffic coverage.</p>
      </div>
    </div>
  );
}
