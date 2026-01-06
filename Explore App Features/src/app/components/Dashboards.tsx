import { useState } from 'react';
import { Plus, Search, ChevronDown, Star, X } from 'lucide-react';

export function Dashboards() {
  const [showNewDashboardModal, setShowNewDashboardModal] = useState(false);

  const templates = [
    {
      id: 'site-performance',
      title: 'Site performance',
      color: 'purple',
      metrics: [
        { label: 'Page views', value: '4,283,239' },
        { label: 'Bounce rate', value: '23%' }
      ]
    },
    {
      id: 'segment-performance',
      title: 'Segment performance',
      color: 'green',
      metrics: [
        { label: 'Compared to segment A', subLabel: 'Number of sessions', value: '2.9M' },
        { label: 'Bounce rate difference', value: '1.55%' }
      ]
    },
    {
      id: 'see-all',
      title: 'See all templates',
      isViewAll: true
    }
  ];

  const modalTemplates = [
    {
      id: 'page-issues',
      title: 'Page issues',
      description: 'Learn where users are getting frustrated or confused, experiencing errors, and more',
      color: 'green'
    },
    {
      id: 'page-overview',
      title: 'Page overview',
      description: 'Track key usage metrics for a single page',
      color: 'purple'
    },
    {
      id: 'web-vitals',
      title: 'Web vitals monitoring',
      description: 'Measure Core Web Vitals to optimize your site\'s performance',
      color: 'blue'
    },
    {
      id: 'segment-perf',
      title: 'Segment performance',
      description: 'Monitor the performance of specific segments to understand impacts and trends',
      color: 'green'
    },
    {
      id: 'site-perf',
      title: 'Site performance',
      description: 'Track key metrics to monitor and optimize your site',
      color: 'purple'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-gray-900">All dashboards</h1>
          <button
            onClick={() => setShowNewDashboardModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New dashboard</span>
          </button>
        </div>
        <p className="text-gray-600">Dashboards created by you and members of your organization appear here</p>
      </div>

      {/* Templates Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Get started with a template</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              {template.isViewAll ? (
                <>
                  <div className="h-32 bg-gray-50 p-4 grid grid-cols-3 gap-2">
                    <div className="bg-blue-100 rounded border-2 border-blue-300"></div>
                    <div className="bg-purple-100 rounded border-2 border-purple-300"></div>
                    <div className="bg-indigo-100 rounded border-2 border-indigo-400"></div>
                    <div className="bg-green-100 rounded border-2 border-green-300"></div>
                    <div className="bg-purple-100 rounded border-2 border-purple-300"></div>
                    <div className="bg-gray-100 rounded border-2 border-gray-300"></div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{template.title}</h3>
                  </div>
                </>
              ) : (
                <>
                  <div className={`h-32 p-4 ${
                    template.color === 'purple' 
                      ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
                      : 'bg-gradient-to-br from-green-300 to-green-500'
                  }`}>
                    <div className="grid grid-cols-2 gap-2 h-full">
                      {template.metrics?.map((metric, idx) => (
                        <div key={idx} className="bg-white/90 rounded-lg p-2 flex flex-col justify-center">
                          <div className="text-xs text-gray-600 mb-1">{metric.label}</div>
                          {metric.subLabel && (
                            <div className="text-xs text-gray-500 mb-1">{metric.subLabel}</div>
                          )}
                          <div className="font-bold text-gray-900">{metric.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900">{template.title}</h3>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search a dashboard"
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm text-gray-700">Quick filters</span>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <span className="text-sm text-gray-700">All categories</span>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <span className="text-sm text-gray-700">All owners</span>
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Dashboards Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Dashboards (1)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Last updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Owned by
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Your rights
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Shared with
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <input type="checkbox" className="rounded border-gray-300" />
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">Key Performance Metrics</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">-</td>
              <td className="px-6 py-4 text-sm text-gray-600">Jan 4, 2026 by You</td>
              <td className="px-6 py-4 text-sm text-gray-600">You</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  Owner
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* New Dashboard Modal */}
      {showNewDashboardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">New dashboard</h2>
                <p className="text-sm text-gray-600">What would you like to track</p>
              </div>
              <button
                onClick={() => setShowNewDashboardModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search a dashboard template..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Create Custom Dashboard */}
              <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    <Plus className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Create custom dashboard</h3>
                    <p className="text-sm text-gray-600">Customize your dashboard with the metrics that matter most to you</p>
                  </div>
                </div>
              </div>

              {/* From a template */}
              <h3 className="font-semibold text-gray-900 mb-4">From a template</h3>
              <div className="space-y-3">
                {modalTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-16 h-12 rounded border-2 ${
                        template.color === 'green' ? 'bg-green-100 border-green-400' :
                        template.color === 'purple' ? 'bg-purple-100 border-purple-400' :
                        'bg-blue-100 border-blue-400'
                      }`}></div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{template.title}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
