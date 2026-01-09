import React from 'react';

const UsersLoveUs = () => {
  return (
    <section className="py-16 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-2">
          LEADER IN PRODUCT ANALYTICS
        </p>
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          <span className="text-blue-600">Users</span> love us
        </h2>
        <p className="text-lg text-gray-700 mb-12">
          We've earned the trust of 37,000+ products worldwide.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Card 1: Costa Coffee */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-red-600 font-bold text-xl">CC</span>
            </div>
            <button type="button" className="text-blue-600 text-sm font-medium flex items-center mb-4 hover:underline">
              Case Study <span className="ml-1">→</span>
            </button>
            <p className="text-5xl font-bold text-gray-900 mb-2">15%</p>
            <p className="text-gray-600 text-center">Registration rate increase</p>
          </div>

          {/* Card 2: Housing.com */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-blue-600 font-bold text-xl">HC</span>
            </div>
            <button type="button" className="text-blue-600 text-sm font-medium flex items-center mb-4 hover:underline">
              Case Study <span className="ml-1">→</span>
            </button>
            <p className="text-5xl font-bold text-gray-900 mb-2">20%</p>
            <p className="text-gray-600 text-center">Feature adoption increase</p>
          </div>

          {/* Card 3: PlaceMakers */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-green-600 font-bold text-xl">PM</span>
            </div>
            <button type="button" className="text-blue-600 text-sm font-medium flex items-center mb-4 hover:underline">
              Case Study <span className="ml-1">→</span>
            </button>
            <p className="text-5xl font-bold text-gray-900 mb-2">2x</p>
            <p className="text-gray-600 text-center">Items sold</p>
          </div>
        </div>

        {/* Ratings Section */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-8">
          {/* G2 Rating */}
          <div className="flex items-center">
            <div className="flex text-yellow-400 mr-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">4.8/5</p>
              <p className="text-sm text-gray-600">G2</p>
            </div>
          </div>

          {/* Gartner Rating */}
          <div className="flex items-center">
            <div className="flex text-yellow-400 mr-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">4.7/5</p>
              <p className="text-sm text-gray-600">Gartner Peer Insights</p>
            </div>
          </div>

          {/* Capterra Rating */}
          <div className="flex items-center">
            <div className="flex text-yellow-400 mr-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">4.8/5</p>
              <p className="text-sm text-gray-600">Capterra</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UsersLoveUs;
