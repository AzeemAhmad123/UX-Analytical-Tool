import React from 'react';

const IncreaseConversions = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="bg-blue-50 rounded-xl p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-uxcam-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Increase conversions</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Identify where users struggle and improve paths to conversion.
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
                "UXCam helps us to find friction points during our order flow that could cause users not to complete an order."
              </blockquote>
              <div className="flex items-center">
                <img
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle fill='%23ff6b35' cx='20' cy='20' r='20'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='white' font-family='Arial' font-size='12' font-weight='bold'%3ERAPPI%3C/text%3E%3C/svg%3E"
                  alt="Rappi"
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <div className="font-semibold text-gray-900">Luis Bitencourt-Emilio</div>
                  <div className="text-sm text-gray-600">Chief Product Officer</div>
                  <div className="text-sm text-orange-500 font-medium">Rappi</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Phone Image with Overlays */}
          <div className="relative">
            <div className="relative">
              {/* Phone Image */}
              <img
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'%3E%3Crect fill='%23f8f9fa' width='400' height='500' rx='30'/%3E%3Crect fill='%23000' x='20' y='20' width='360' height='460' rx='20'/%3E%3Crect fill='%23fff' x='30' y='30' width='340' height='440' rx='15'/%3E%3C/svg%3E"
                alt="Phone with hand"
                className="w-full h-auto"
              />
              
              {/* Hand pointing */}
              <div className="absolute top-1/2 right-0 transform translate-x-1/2">
                <img
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%23fdbcb4' width='200' height='200'/%3E%3Cpath d='M50 100 Q100 80 150 100' fill='none' stroke='%23e6a8d7' stroke-width='20'/%3E%3C/svg%3E"
                  alt="Hand pointing"
                  className="w-32 h-32"
                />
              </div>

              {/* Floating Labels */}
              <div className="absolute top-1/4 left-0 bg-white rounded-lg shadow-lg p-3 transform -translate-x-1/2">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium">UI freeze</span>
                </div>
              </div>

              <div className="absolute top-1/3 right-0 bg-white rounded-lg shadow-lg p-3 transform translate-x-1/2">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium">Rage taps</span>
                </div>
              </div>

              <div className="absolute bottom-1/3 left-0 bg-white rounded-lg shadow-lg p-3 transform -translate-x-1/2">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                  </svg>
                  <span className="text-sm font-medium">Abandoned cart</span>
                </div>
              </div>

              {/* Background Shapes */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-100 rounded-full opacity-50"></div>
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-100 rounded-full opacity-50"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IncreaseConversions;
