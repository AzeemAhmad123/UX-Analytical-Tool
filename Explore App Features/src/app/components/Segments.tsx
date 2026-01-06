import { useState } from 'react';
import { Search, Star, Users, UserPlus, RefreshCw } from 'lucide-react';

export function Segments() {
  const [activeTab, setActiveTab] = useState<'segments' | 'data-connect'>('segments');
  const [filter, setFilter] = useState<'all' | 'my' | 'favorites'>('all');

  const segments = [
    {
      id: 'all-users',
      name: 'All users',
      lastUpdate: '4/20/2022',
      traffic: '0.00%',
      conversion: '0.00%',
      bounce: '0.00%',
      isDefault: true
    },
    {
      id: 'new-users',
      name: 'New users',
      lastUpdate: '10/27/2025',
      traffic: '0.00%',
      conversion: '0.00%',
      bounce: '0.00%'
    },
    {
      id: 'returning-users',
      name: 'Returning users',
      lastUpdate: '10/27/2025',
      traffic: '0.00%',
      conversion: '0.00%',
      bounce: '0.00%'
    }
  ];

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Filters */}
      <div className="w-80 bg-white border-r border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">Filters</h2>
          <button className="text-sm text-gray-600 hover:text-gray-900">Reset</button>
        </div>

        {/* Show results for */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Show results for</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="filter"
                checked={filter === 'all'}
                onChange={() => setFilter('all')}
                className="w-4 h-4 text-purple-600"
              />
              <span className="text-sm text-gray-700">All segments (3)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="filter"
                checked={filter === 'my'}
                onChange={() => setFilter('my')}
                className="w-4 h-4 text-purple-600"
              />
              <span className="text-sm text-gray-700">My segments (0)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="filter"
                checked={filter === 'favorites'}
                onChange={() => setFilter('favorites')}
                className="w-4 h-4 text-purple-600"
              />
              <span className="text-sm text-gray-700">Favorites (0)</span>
            </label>
          </div>
        </div>

        {/* Search */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Search by segment name</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by segment name..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>

        {/* Sessions Progress */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Sessions</span>
            <span className="text-xs font-medium text-gray-900">0 / 200K</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: '0%' }}></div>
          </div>
          <p className="text-xs text-gray-600">Resets Feb 2</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('segments')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'segments'
                  ? 'border-purple-600 text-purple-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Segments
            </button>
            <button
              onClick={() => setActiveTab('data-connect')}
              className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'data-connect'
                  ? 'border-purple-600 text-purple-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              Data Connect
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Segments</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            <span className="text-sm font-medium">New segment</span>
          </button>
        </div>

        {/* Segments List */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-semibold text-gray-900">Segments List</h3>
          </div>

          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input type="checkbox" className="rounded border-gray-300" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Last Update
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Traffic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Conversion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Bounce
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {segments.map((segment) => (
                <tr key={segment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-gray-400" />
                      {segment.isDefault ? (
                        <Users className="w-4 h-4 text-gray-600" />
                      ) : segment.id === 'new-users' ? (
                        <UserPlus className="w-4 h-4 text-gray-600" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-gray-600" />
                      )}
                      <span className="text-sm text-gray-900">{segment.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{segment.lastUpdate}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{segment.traffic}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{segment.conversion}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{segment.bounce}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">3 items</span>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">10, 20 results per page</span>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">← prev</button>
                <button className="px-3 py-1 text-sm bg-purple-600 text-white rounded">1</button>
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Next →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
