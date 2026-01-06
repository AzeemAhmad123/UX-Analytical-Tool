import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export function OnboardingContent() {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    const code = '<script src="https://t.contentsquare.net/uxa/72ef867dceb09.js"></script>';
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const toggleStep = (step: number) => {
    setExpandedStep(expandedStep === step ? null : step);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <p className="text-gray-600 mb-2">Welcome, Azeem</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Get started</h1>
        <p className="text-gray-600 mb-6">
          Set up your account and start getting the most out of Contentsquare.<br />
          This page will be available until you complete all the steps.
        </p>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: '0%' }}></div>
          </div>
          <span className="text-sm text-gray-600">0 / 4 completed</span>
        </div>
      </div>

      {/* Onboarding Steps */}
      <div className="space-y-4">
        {/* Step 1: Tag Installation */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleStep(1)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-gray-700 font-medium">
                1
              </span>
              <span className="font-medium text-gray-900">Tag installation</span>
            </div>
            {expandedStep === 1 ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {expandedStep === 1 && (
            <div className="px-6 pb-6 space-y-4">
              {/* Trial Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-amber-900 font-medium mb-1">
                      You have a 15-day free trial waiting for you!
                    </p>
                    <p className="text-sm text-amber-800">
                      After installing the code, you and your team will have free access to more advanced features, like AI and frustration score.
                      After that, you'll go back to the Free plan. No card needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 1.1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm text-gray-700">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-3">Copy the code.</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <code className="text-sm text-gray-800 font-mono">
                      &lt;script src="https://t.contentsquare.net/uxa/72ef867dceb09.js"&gt;&lt;/script&gt;
                    </code>
                    <button
                      onClick={handleCopyCode}
                      className="ml-4 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 1.2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm text-gray-700">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Paste the code into the &lt;head&gt; of every page where you want to track user behavior or collect feedback.
                  </p>
                </div>
              </div>

              {/* Step 1.3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm text-gray-700">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    To make sure everything is ready, verify that your code was installed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Steps (collapsed) */}
        {[2, 3, 4].map((stepNum) => (
          <div key={stepNum} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleStep(stepNum)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <span className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-gray-700 font-medium">
                  {stepNum}
                </span>
                <span className="font-medium text-gray-900">Step {stepNum}</span>
              </div>
              {expandedStep === stepNum ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
