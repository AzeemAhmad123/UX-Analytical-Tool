import { Rocket, Home, LayoutDashboard, TrendingUp, Flame, PlayCircle, Gauge, MessageSquare, ChevronRight } from 'lucide-react';

interface SidebarProps {
  currentPage: 'get-started' | 'session-replay' | 'heatmaps' | 'funnel' | 'dashboards' | 'home' | 'voice-of-customer' | 'segments' | 'web-performance';
  onNavigate: (page: 'get-started' | 'session-replay' | 'heatmaps' | 'funnel' | 'dashboards' | 'home' | 'voice-of-customer' | 'segments' | 'web-performance') => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    { icon: Rocket, label: 'Get started', page: 'get-started' as const },
    { icon: Home, label: 'Home', page: 'home' as const },
    { icon: LayoutDashboard, label: 'Dashboards', page: 'dashboards' as const },
    { icon: TrendingUp, label: 'Funnel', page: 'funnel' as const },
    { icon: Flame, label: 'Heatmaps', page: 'heatmaps' as const },
    { icon: PlayCircle, label: 'Session Replay', page: 'session-replay' as const },
    { icon: Gauge, label: 'Web Performance', page: 'web-performance' as const },
    { icon: MessageSquare, label: 'Voice of customer', page: 'voice-of-customer' as const },
  ];

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">CSQ</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => item.page && onNavigate(item.page)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
              item.page === currentPage
                ? 'bg-purple-50 text-purple-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4" />
              <span className="text-sm">{item.label}</span>
            </div>
            {item.hasSubmenu && <ChevronRight className="w-4 h-4" />}
          </button>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {/* Sessions Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Sessions</span>
            <span className="text-xs font-medium text-gray-900">0 / 200k</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '0%' }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Resets Feb 2</p>
        </div>

        {/* Links */}
        <button
          onClick={() => onNavigate('segments')}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
            currentPage === 'segments'
              ? 'bg-purple-50 text-purple-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Explore plans</span>
        </button>
        <button
          onClick={() => onNavigate('segments')}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
            currentPage === 'segments'
              ? 'bg-purple-50 text-purple-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Analysis setup</span>
        </button>
      </div>
    </aside>
  );
}