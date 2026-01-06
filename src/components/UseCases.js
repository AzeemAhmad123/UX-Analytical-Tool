import React from 'react';

const UseCases = () => {
  return (
    <section className="py-20 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-4">USE CASES</p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            A blessing for <span className="text-uxcam-blue">product teams</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Image with Metrics */}
          <div className="relative">
            <div className="relative">
              {/* Main Image */}
              <img
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23f0f0f0' width='400' height='400'/%3E%3Ccircle cx='200' cy='150' r='60' fill='%23fdbcb4'/%3E%3Cpath d='M140 150 Q200 120 260 150' fill='none' stroke='%238b4513' stroke-width='3'/%3E%3Ccircle cx='180' cy='140' r='3' fill='%23000'/%3E%3Ccircle cx='220' cy='140' r='3' fill='%23000'/%3E%3Cpath d='M190 160 Q200 170 210 160' fill='none' stroke='%23000' stroke-width='2'/%3E%3Crect x='150' y='200' width='100' height='150' fill='%23000' rx='10'/%3E%3Crect x='160' y='210' width='80' height='120' fill='%23333' rx='5'/%3E%3C/svg%3E"
                alt="Man with phone"
                className="w-full h-auto"
              />
              
              {/* Overlay Metrics Card */}
              <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 bg-opacity-90 rounded-xl p-4 text-white max-w-xs">
                <h3 className="font-semibold mb-3">Top Events</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
                      </svg>
                      Location
                    </span>
                    <span>2.5K</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                      Time in App
                    </span>
                    <span>3.2s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                      </svg>
                      Active Users
                    </span>
                    <span>8.4K</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                      </svg>
                      Sessions
                    </span>
                    <span>1.2K</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                      </svg>
                      Page taps
                    </span>
                    <span>9.9K</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                      Country
                    </span>
                    <span>45</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Content Card */}
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-uxcam-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Improve UX</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Uncover the reasons behind frustrated user experiences with Tara, your AI analyst.
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
                "Tara highlighted the top issues I would have spent 20 hours reviewing videos to find, and it did it very quickly."
              </blockquote>
              <div className="flex items-center">
                <img
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle fill='%234169e1' cx='20' cy='20' r='20'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='white' font-family='Arial' font-size='14' font-weight='bold'%3EDL%3C/text%3E%3C/svg%3E"
                  alt="Daniel Lee"
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <div className="font-semibold text-gray-900">Daniel Lee</div>
                  <div className="text-sm text-gray-600">Senior Product Manager</div>
                  <div className="text-sm text-uxcam-blue font-medium">Virgin mobile</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UseCases;
