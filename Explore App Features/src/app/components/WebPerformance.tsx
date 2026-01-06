import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export function WebPerformance() {
  const [activeTab, setActiveTab] = useState<'single' | 'compare' | 'cache'>('single');
  const [showRecommended, setShowRecommended] = useState(true);

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analyze and compare performance</h1>
        <p className="text-gray-600">
          Analyze the web performance of your page to fix issues or compare the speed and quality between 2 pages.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('single')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'single'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Single page
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'compare'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Compare
          </button>
          <button
            onClick={() => setActiveTab('cache')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'cache'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Cache testing (1st vs 2nd visit)
          </button>
        </div>
      </div>

      {/* Recommended Pages Section */}
      {showRecommended && (
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <button
            onClick={() => setShowRecommended(!showRecommended)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div>
              <h2 className="font-semibold text-gray-900 text-left">Recommended pages</h2>
              <p className="text-sm text-gray-600 text-left mt-1">
                These are your most visited pages (from real user monitoring) over the last 7 days. You can select them to analyze on "Analyze single page".
              </p>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showRecommended ? '' : 'rotate-180'}`} />
          </button>
        </div>
      )}

      {/* Analyze Single Page Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">Analyze single page</h2>
          <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            Select an existing configuration
          </button>
        </div>

        {/* URL Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            URL of the page to analyze
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="ex: http://www.example.org/"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
        </div>

        {/* Settings Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Device */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Device</label>
            <div className="relative">
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm appearance-none bg-white pr-10">
                <option>Desktop</option>
                <option>Mobile</option>
                <option>Tablet</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            </div>
          </div>

          {/* Localization */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Localization</label>
            <div className="relative">
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm appearance-none bg-white pr-10">
                <option>🇫🇷 France</option>
                <option>🇺🇸 United States</option>
                <option>🇬🇧 United Kingdom</option>
                <option>🇩🇪 Germany</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            </div>
          </div>

          {/* Bandwidth */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Bandwidth</label>
            <div className="relative">
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm appearance-none bg-white pr-10">
                <option>ADSL (8.0 Mbps downstream, 1.5 Mbps upstream, 50 ms)</option>
                <option>Cable (20 Mbps downstream, 5 Mbps upstream, 28 ms)</option>
                <option>Fiber (50 Mbps downstream, 10 Mbps upstream, 10 ms)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="mb-6">
          <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
            <ChevronDown className="w-4 h-4" />
            <span>Advanced settings</span>
            <HelpCircle className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Analyze Button */}
        <div className="flex justify-end">
          <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            Analyze
          </button>
        </div>
      </div>

      {/* Sessions Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
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
  );
}
