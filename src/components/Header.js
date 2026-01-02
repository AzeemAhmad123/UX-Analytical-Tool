import React from 'react';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/images/logo.svg" alt="uxcam" className="h-8 w-auto" />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="relative group">
              <button className="flex items-center text-gray-700 hover:text-uxcam-blue transition-colors">
                Why UXCam
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="relative group">
              <button className="flex items-center text-gray-700 hover:text-uxcam-blue transition-colors">
                Product
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="relative group">
              <button className="flex items-center text-gray-700 hover:text-uxcam-blue transition-colors">
                Solutions
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="relative group">
              <button className="flex items-center text-gray-700 hover:text-uxcam-blue transition-colors">
                Resources
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <button className="text-gray-700 hover:text-uxcam-blue transition-colors">
              Pricing
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button className="text-gray-700 hover:text-uxcam-blue transition-colors">
              Login
            </button>
            <button className="px-4 py-2 text-uxcam-blue border border-uxcam-blue rounded-lg hover:bg-uxcam-light transition-colors">
              Start
            </button>
            <button className="px-4 py-2 bg-uxcam-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
              Start
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
