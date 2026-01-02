import React from 'react';

const DriveEngagement = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="bg-green-50 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Drive engagement</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Identify friction points in journeys, and uncover the reasons for low feature adoption.
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
                "I can see how users actually navigate through the product and quickly determine product changes that need to be made."
              </blockquote>
              <div className="flex items-center">
                <img
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle fill='%234169e1' cx='20' cy='20' r='20'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='white' font-family='Arial' font-size='10' font-weight='bold'%3EROLLKALL%3C/text%3E%3C/svg%3E"
                  alt="RollKall"
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <div className="font-semibold text-gray-900">Misha Wise</div>
                  <div className="text-sm text-gray-600">Product Business Analyst</div>
                  <div className="text-sm text-uxcam-blue font-medium">RollKall</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Image with Floating Elements */}
          <div className="relative">
            <div className="relative">
              {/* Main Image - Woman with laptop */}
              <img
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect fill='%23f0f7ff' width='400' height='400'/%3E%3Ccircle cx='200' cy='150' r='60' fill='%23fdbcb4'/%3E%3Cpath d='M140 150 Q200 120 260 150' fill='none' stroke='%238b4513' stroke-width='3'/%3E%3Ccircle cx='180' cy='140' r='3' fill='%23000'/%3E%3Ccircle cx='220' cy='140' r='3' fill='%23000'/%3E%3Cpath d='M190 160 Q200 170 210 160' fill='none' stroke='%23000' stroke-width='2'/%3E%3Crect x='120' y='220' width='160' height='100' fill='%23e0e0e0' rx='5'/%3E%3Crect x='130' y='230' width='140' height='80' fill='%23333' rx='3'/%3E%3C/svg%3E"
                alt="Woman with laptop"
                className="w-full h-auto"
              />

              {/* Floating Elements */}
              <div className="absolute top-1/4 right-0 bg-white rounded-lg shadow-lg p-3 transform translate-x-1/2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium">AI analyst</span>
                </div>
              </div>

              <div className="absolute top-1/2 left-0 bg-white rounded-lg shadow-lg p-3 transform -translate-x-1/2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Session insight</span>
                </div>
              </div>

              <div className="absolute bottom-1/3 right-1/4 bg-white rounded-lg shadow-lg p-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Session summary</span>
                </div>
              </div>

              {/* Background Shapes */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-100 rounded-full opacity-30"></div>
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-100 rounded-full opacity-30"></div>
              <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-green-100 rounded-full opacity-20 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DriveEngagement;
