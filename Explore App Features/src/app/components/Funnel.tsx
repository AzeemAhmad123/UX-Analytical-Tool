import { useState } from 'react';
import { Plus, LayoutGrid, ChevronUp } from 'lucide-react';

export function Funnel() {
  const [expandedSection, setExpandedSection] = useState(true);

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-1">Funnel</h1>
          <p className="text-gray-600">Measure conversions and learn why users drop off</p>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 mb-8">
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

      {/* Funnel Steps Section */}
      <div className="bg-white border border-gray-200 rounded-lg mb-8">
        <button
          onClick={() => setExpandedSection(!expandedSection)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div>
            <h2 className="font-semibold text-gray-900 text-left">Funnel steps</h2>
            <p className="text-sm text-gray-600 text-left">Session where users...</p>
          </div>
          <ChevronUp
            className={`w-5 h-5 text-gray-400 transition-transform ${
              expandedSection ? '' : 'rotate-180'
            }`}
          />
        </button>

        {expandedSection && (
          <div className="px-6 pb-6 space-y-3">
            {/* Step 1 */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-sm text-gray-700">1</span>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add step</span>
              </button>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-sm text-gray-700">2</span>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add step</span>
              </button>
            </div>

            {/* Apply Button */}
            <div className="pt-2">
              <button className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chart Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="flex items-end justify-center gap-4 h-64">
          {/* Bar 1 */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-gray-500">*</div>
            <div className="w-24 bg-blue-200 rounded-t-lg" style={{ height: '75%' }}></div>
          </div>

          {/* Bar 2 */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-gray-500">*</div>
            <div className="w-24 bg-blue-300 rounded-t-lg" style={{ height: '90%' }}></div>
          </div>

          {/* Bar 3 */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs text-gray-500">*</div>
            <div className="w-24 bg-blue-200 rounded-t-lg" style={{ height: '60%' }}></div>
          </div>

          {/* Decorative dots */}
          <div className="absolute top-8 left-1/4 w-1 h-1 bg-blue-300 rounded-full"></div>
          <div className="absolute top-16 right-1/4 w-1 h-1 bg-blue-300 rounded-full"></div>
          <div className="absolute bottom-32 left-1/3 w-1 h-1 bg-blue-300 rounded-full"></div>
          <div className="absolute top-12 right-1/3 w-1.5 h-1.5 bg-blue-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
