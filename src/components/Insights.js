import React from 'react';

const Insights = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-4">EMPOWER YOUR PRODUCT TEAM</p>
          <h2 className="text-5xl font-bold text-gray-900 leading-tight">
            Truly actionable <br />
            <span className="text-blue-600">real-time insights</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Text Cards */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">
                <span className="text-blue-600">Understand how</span> users behave
              </h3>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">
                Have all your <span className="text-blue-600">metrics</span> in one place
              </h3>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">
                Analyze instantly with <span className="text-blue-600">Autocapture</span>
              </h3>
            </div>
          </div>

          {/* Right Column - Video in Blue Box */}
          <div className="relative bg-blue-500 p-8 rounded-lg shadow-lg">
            <div className="bg-white rounded-lg p-4 shadow-inner">
              <video
                className="w-full h-auto rounded"
                autoPlay
                loop
                muted
                playsInline
                poster="/images/Hero-webp.webp"
              >
                <source src="/images/UXCam - Product Analytics Without The Complexity.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Insights;
