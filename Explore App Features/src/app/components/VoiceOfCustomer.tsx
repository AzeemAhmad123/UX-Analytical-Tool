import { useState } from 'react';
import { Plus, ExternalLink } from 'lucide-react';

export function VoiceOfCustomer() {
  const [activeTab, setActiveTab] = useState<'surveys' | 'interviews' | 'tests'>('surveys');

  const templates = [
    {
      id: 'browse',
      title: 'Browse all templates',
      icon: '📋',
      color: 'bg-gray-50'
    },
    {
      id: 'survey',
      title: 'Collect ongoing feedback via a survey',
      icon: '📝',
      badge: 'SURVEY',
      color: 'bg-orange-50',
      stars: 5
    },
    {
      id: 'prototype',
      title: 'Assess prototype or website usability in user interviews',
      icon: '💬',
      badge: 'INTERVIEW',
      color: 'bg-pink-50'
    },
    {
      id: 'validate',
      title: 'Validate design concepts or ideas in user interviews',
      icon: '📄',
      badge: 'INTERVIEW',
      color: 'bg-purple-50'
    },
    {
      id: 'nps',
      title: 'Measure long-term loyalty with an NPS® survey',
      icon: '📊',
      badge: 'SURVEY',
      color: 'bg-orange-50'
    },
    {
      id: 'unmoderated',
      title: 'Run an unmoderated test on a live website',
      icon: '🖥️',
      badge: 'TEST',
      color: 'bg-blue-50'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Voice of Customer</h1>
          <p className="text-gray-600">Get insights fast by connecting with users through surveys, tests, and interviews</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-sm text-gray-700">Share</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Create</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 mt-8">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`${template.color} border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer`}
          >
            <div className="flex flex-col items-center text-center h-full">
              <div className="text-4xl mb-4">{template.icon}</div>
              {template.badge && (
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded mb-3 ${
                  template.badge === 'SURVEY' ? 'bg-orange-200 text-orange-800' :
                  template.badge === 'INTERVIEW' ? 'bg-pink-200 text-pink-800' :
                  'bg-blue-200 text-blue-800'
                }`}>
                  {template.badge}
                </span>
              )}
              <h3 className="font-medium text-gray-900 mb-2">{template.title}</h3>
              {template.stars && (
                <div className="flex gap-1 mt-2">
                  {[...Array(template.stars)].map((_, i) => (
                    <span key={i} className="text-yellow-400">⭐</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('surveys')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'surveys'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Surveys
          </button>
          <button
            onClick={() => setActiveTab('interviews')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'interviews'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Interviews
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'tests'
                ? 'border-purple-600 text-gray-900 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Tests
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No surveys yet</h3>
        <p className="text-gray-600 mb-4">When you create a new survey, it will show up here.</p>
        <button className="flex items-center gap-2 px-4 py-2 mx-auto border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <span className="text-sm text-gray-700">Create survey</span>
          <ExternalLink className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Sidebar Info */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-700">Responses</span>
          <span className="text-sm font-medium text-gray-900">0 / 100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div className="bg-purple-600 h-2 rounded-full" style={{ width: '0%' }}></div>
        </div>
        <p className="text-xs text-gray-600">Resets Feb 1</p>
      </div>
    </div>
  );
}
