import React from 'react';

const ResolveIssues = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Session Replay UI */}
          <div className="relative">
            <div className="bg-white rounded-xl shadow-xl overflow-hidden">
              {/* Phone Frame */}
              <div className="bg-gray-900 p-4 rounded-t-xl">
                <div className="bg-white rounded-lg p-2">
                  {/* Screen Content */}
                  <div className="bg-gradient-to-br from-purple-400 to-blue-400 h-64 rounded relative overflow-hidden">
                    {/* Waveform Pattern */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
                      <path
                        d="M0 150 Q50 100 100 150 T200 150 T300 150 T400 150"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="2"
                        fill="none"
                      />
                      <path
                        d="M0 150 Q50 200 100 150 T200 150 T300 150 T400 150"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Session Info Overlay */}
              <div className="absolute top-8 left-8 bg-white rounded-lg shadow-lg p-3 max-w-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">Session #947</span>
                  <span className="text-xs text-gray-400">01:03</span>
                </div>
                <div className="text-sm font-medium text-gray-900 mb-2">Home Activity</div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span>0:03.8 Button Pressed</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <span>0:03.8 Rage Tap</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    <span>0:03.8 View Group</span>
                  </div>
                </div>
              </div>

              {/* Sign-up Rate Overlay */}
              <div className="absolute top-8 right-8 bg-white rounded-lg shadow-lg p-3">
                <div className="text-sm font-medium text-gray-900 mb-1">Sign-up rate</div>
                <div className="text-2xl font-bold text-uxcam-blue">64%</div>
                <div className="h-8 flex items-end space-x-1 mt-2">
                  <div className="w-1 h-4 bg-blue-300"></div>
                  <div className="w-1 h-6 bg-blue-400"></div>
                  <div className="w-1 h-3 bg-blue-300"></div>
                  <div className="w-1 h-8 bg-blue-500"></div>
                  <div className="w-1 h-5 bg-blue-400"></div>
                  <div className="w-1 h-7 bg-blue-500"></div>
                  <div className="w-1 h-4 bg-blue-300"></div>
                </div>
              </div>

              {/* Session Replay Tooltip */}
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                <div className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm">
                  Session replay
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                </div>
              </div>

              {/* Media Controls */}
              <div className="bg-gray-100 p-4 rounded-b-xl">
                <div className="flex items-center justify-center space-x-4">
                  <button className="p-2 hover:bg-gray-200 rounded">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.445 14.832A1 1 0 0010 14v-8a1 1 0 00-1.555-.832L5 7.5V6a1 1 0 00-2 0v8a1 1 0 002 0v-1.5l3.445 2.332z"/>
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L8 12.5V14a1 1 0 002 0V6a1 1 0 00-2 0v1.5L4.555 5.168z"/>
                    </svg>
                  </button>
                  <div className="flex-1 bg-gray-300 rounded-full h-1">
                    <div className="bg-uxcam-blue h-1 rounded-full w-1/3"></div>
                  </div>
                  <span className="text-sm text-gray-600">0:03</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Content */}
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Resolve issues</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Shorten feedback loops by giving your team the full context to resolve issues faster.
              </p>
              <button className="inline-flex items-center text-uxcam-blue hover:text-blue-700 font-medium">
                Learn more
                <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </div>

            {/* Testimonial */}
            <div className="bg-gray-50 rounded-xl p-6">
              <blockquote className="text-gray-700 italic mb-4">
                "We had problems identifying issues that our development team could never re-create. With UXCam we were able to find the issue quickly and resolve it."
              </blockquote>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold">H</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Jon Kinney</div>
                  <div className="text-sm text-gray-600">Partner & CTO</div>
                  <div className="text-sm text-uxcam-blue font-medium">Headway</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResolveIssues;
