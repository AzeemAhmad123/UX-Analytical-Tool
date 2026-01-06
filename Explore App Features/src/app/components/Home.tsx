import { HelpCircle, Share2, Star, Calendar, Users, ExternalLink, X } from 'lucide-react';

export function Home() {
  const metrics = [
    {
      title: 'Number of sessions',
      value: '0',
      change: '0% vs. previous 7 days',
      hasInfo: true
    },
    {
      title: 'Bounce rate',
      value: '0%',
      change: '0% vs. previous 7 days',
      hasInfo: true
    },
    {
      title: 'Session time',
      value: '0s',
      change: '0% vs. previous 7 days',
      hasInfo: true
    },
    {
      title: 'Largest Contentful Paint (LCP)',
      value: '0s',
      change: '0% vs. previous 7 days',
      hasInfo: true
    }
  ];

  const recentlyViewed = [
    {
      title: 'Funnel',
      time: '3 minutes ago',
      dateRange: 'Dec 28, 2025 → Jan 3 2026',
      users: 'All users',
      link: 'Open Funnel',
      page: 'funnel'
    },
    {
      title: 'Session Replay',
      time: '20 minutes ago',
      dateRange: 'Dec 28, 2025 → Jan 3 2026',
      users: 'All users',
      link: 'Open Session Replay',
      page: 'session-replay'
    },
    {
      title: 'Key Performance Metrics',
      time: '3 hours ago',
      dateRange: 'Dec 28, 2025 → Jan 3 2026',
      users: 'All users',
      link: 'Open Dashboard',
      page: 'dashboards'
    }
  ];

  const suggestions = [
    {
      title: 'Watch how users interact with your site',
      description: 'Understand your full user journey with easy playback of real user interactions with Session replays. Filter based on what you need like Country, Page views, or Frustration.',
      action: 'View replays',
      color: 'from-teal-900 to-teal-700',
      image: 'session-replay'
    },
    {
      title: 'Get an overview of user behavior',
      description: 'See where users click, move, and scroll across your key pages. Understand what might be causing friction with Heatmaps and improve quickly.',
      action: 'View heatmaps',
      color: 'from-pink-900 to-pink-700',
      image: 'heatmap'
    },
    {
      title: 'Learn where and why users drop off',
      description: 'Find out how users progress through the most important pages, measure conversions, and find potential issues fast by zooming into relevant recordings with Funnels.',
      action: 'Set up a funnel',
      color: 'from-red-400 to-red-300',
      image: 'funnel'
    },
    {
      title: 'Using Slack or Google Analytics?',
      description: 'Integrate your most-used tools to save time and improve collaboration with your team. Start with your favorite messaging app, data or A/B testing platform.',
      action: 'View integrations',
      color: 'from-indigo-300 to-indigo-200',
      image: 'integrations',
      isSmall: true
    },
    {
      title: 'More learning, more insights',
      description: 'Discover all the courses developed for you and learn how to get the most out of Contentsquare to achieve your goals.',
      action: 'Visit Contentsquare University',
      badge: 'Training',
      hasExternal: true,
      isSmall: true
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Welcome Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Welcome back, Azeem</h1>

      {/* At a Glance Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">azeem at a glance</h2>
        <p className="text-sm text-gray-600 mb-6">
          Dive into the most impactful data from the past 7 days (Dec 27 2025 → Jan 3 2026).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-700">{metric.title}</span>
                {metric.hasInfo && <HelpCircle className="w-4 h-4 text-gray-400" />}
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
                <div className="text-sm text-gray-600">{metric.change}</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mb-4">
                <div className="bg-purple-600 h-1 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <div className="flex items-center justify-between">
                <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  Learn more
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Share2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Survey Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-sm text-gray-900">What would make this page more useful for you? Let us know in a quick survey.</span>
        </div>
        <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
          Answer survey
        </button>
      </div>

      {/* Recently Viewed */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your recently viewed</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentlyViewed.map((item, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs text-gray-500">{item.time}</span>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 mb-4">{item.title}</h3>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">{item.dateRange}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">{item.users}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {item.link}
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                  <Star className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested for You */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Suggested for you</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestions.map((item, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Image/Preview */}
              {item.image && !item.isSmall && (
                <div className={`h-32 bg-gradient-to-br ${item.color} p-4 flex items-center justify-center`}>
                  {item.image === 'session-replay' && (
                    <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                      <div className="bg-white rounded shadow-lg p-2 h-16"></div>
                      <div className="bg-white rounded shadow-lg p-2 h-16"></div>
                    </div>
                  )}
                  {item.image === 'heatmap' && (
                    <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                      <div className="bg-white rounded shadow-lg p-2 h-16"></div>
                      <div className="bg-white rounded shadow-lg p-2 h-16"></div>
                    </div>
                  )}
                  {item.image === 'funnel' && (
                    <div className="bg-white rounded shadow-lg p-4 w-full max-w-xs h-20 flex items-center justify-center">
                      <div className="w-full h-12 bg-purple-900 rounded"></div>
                    </div>
                  )}
                </div>
              )}
              {item.image === 'integrations' && (
                <div className={`h-32 bg-gradient-to-br ${item.color} p-4 flex items-center justify-center`}>
                  <div className="bg-white rounded-lg shadow-lg p-3 w-full max-w-xs">
                    <div className="flex gap-2 mb-2">
                      <div className="w-6 h-6 bg-yellow-400 rounded"></div>
                      <div className="w-6 h-6 bg-gray-300 rounded"></div>
                      <div className="w-6 h-6 bg-blue-500 rounded"></div>
                      <div className="w-6 h-6 bg-purple-500 rounded"></div>
                      <div className="w-6 h-6 bg-green-500 rounded"></div>
                      <div className="w-6 h-6 bg-orange-500 rounded"></div>
                    </div>
                    <div className="h-8 bg-gray-100 rounded"></div>
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                {item.badge && (
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded mb-2">
                    {item.badge}
                  </span>
                )}
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                <button className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {item.action}
                  {item.hasExternal && <ExternalLink className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
