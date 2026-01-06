import { useState } from 'react';
import { Plus } from 'lucide-react';

export function Heatmaps() {
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'favorites'>('all');

  const templates = [
    {
      id: 'scratch',
      title: 'Start from scratch',
      description: 'Create a new analysis from scratch',
      image: null,
      icon: true,
    },
    {
      id: 'attention',
      title: 'Attention',
      description: 'Create an analysis showing user engagement',
      image: 'attention',
      gradient: 'from-purple-900 to-pink-600',
    },
    {
      id: 'top-clicks',
      title: 'Top clicks',
      description: 'Analyze where your visitors click the most',
      image: 'top-clicks',
      gradient: 'from-teal-800 to-teal-600',
    },
    {
      id: 'rage-clicks',
      title: 'Rage clicks',
      description: 'Identify friction areas on your page',
      image: 'rage-clicks',
      gradient: 'from-green-800 to-green-600',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Heatmaps</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New heatmap</span>
        </button>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          >
            {/* Card Image/Icon */}
            <div className={`h-40 flex items-center justify-center ${
              template.icon 
                ? 'bg-gray-100' 
                : `bg-gradient-to-br ${template.gradient}`
            }`}>
              {template.icon ? (
                <Plus className="w-12 h-12 text-gray-400" />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4">
                  {template.id === 'attention' && (
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 w-full h-full flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="text-6xl font-bold mb-2">22%</div>
                        <div className="text-sm">User Engagement</div>
                      </div>
                    </div>
                  )}
                  {template.id === 'top-clicks' && (
                    <div className="bg-white rounded-lg shadow-lg p-3 w-full h-full relative overflow-hidden">
                      <div className="absolute top-2 left-2 w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex gap-2 mt-6">
                        <div className="w-1/3 h-16 bg-gray-200 rounded"></div>
                        <div className="w-1/3 h-16 bg-gray-200 rounded"></div>
                        <div className="w-1/3 h-16 bg-gray-200 rounded"></div>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-teal-700">Top clicked areas</div>
                    </div>
                  )}
                  {template.id === 'rage-clicks' && (
                    <div className="bg-white rounded-lg shadow-lg p-3 w-full h-full relative">
                      <div className="absolute top-3 right-3">
                        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-xs">⚠️</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-6">
                        <div className="w-1/2 h-12 bg-gray-100 rounded"></div>
                        <div className="w-1/2 h-12 bg-gray-100 rounded"></div>
                      </div>
                      <div className="mt-2">
                        <div className="h-8 bg-red-100 rounded"></div>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-green-700">Friction detection</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'my'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            My heatmaps
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All heatmaps
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'favorites'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Favorites
          </button>
        </div>
      </div>
    </div>
  );
}
