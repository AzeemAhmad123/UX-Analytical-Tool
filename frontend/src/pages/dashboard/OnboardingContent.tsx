import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { projectsAPI } from '../../services/api'
import '../../components/dashboard/Dashboard.css'

export function OnboardingContent() {
  const [expandedStep, setExpandedStep] = useState<number | null>(1)
  const [copiedCode, setCopiedCode] = useState(false)
  const [sdkKey, setSdkKey] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll()
      const projectsList = response.projects || []
      setProjects(projectsList)
      if (projectsList.length > 0) {
        setSdkKey(projectsList[0].sdk_key)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const [sdkVersion, setSdkVersion] = useState<'basic' | 'rrweb'>('rrweb')

  const handleCopyCode = () => {
    let code = ''
    
    if (sdkVersion === 'rrweb') {
      code = `<!-- Load rrweb for visual session replay -->
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>

<!-- UXCam SDK Configuration -->
<script>
  window.UXCamSDK = {
    key: '${sdkKey}',
    apiUrl: 'http://localhost:3001'
  };
</script>

<!-- Load UXCam SDK with DOM recording -->
<script src="http://localhost:5173/uxcam-sdk-rrweb.js" async></script>`
    } else {
      code = `<script>
  (function() {
    window.UXCamSDK = {
      key: '${sdkKey}',
      apiUrl: 'http://localhost:3001'
    };
    var script = document.createElement('script');
    script.src = '/uxcam-sdk.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`
    }
    
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const toggleStep = (step: number) => {
    setExpandedStep(expandedStep === step ? null : step)
  }

  return (
    <div className="dashboard-page-content" style={{ maxWidth: '896px' }}>
      {/* Welcome Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: '#4b5563', marginBottom: '0.5rem' }}>Welcome!</p>
        <h1 className="page-title" style={{ marginBottom: '1rem' }}>Get started</h1>
        <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
          Set up your account and start getting the most out of UXCam.<br />
          This page will be available until you complete all the steps.
        </p>

        {/* Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '6px' }}>
            <div style={{ backgroundColor: '#9333ea', height: '6px', borderRadius: '9999px', width: '0%' }}></div>
          </div>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>0 / 4 completed</span>
        </div>
      </div>

      {/* Onboarding Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Step 1: Tag Installation */}
        <div className="collapsible-section">
          <button
            onClick={() => toggleStep(1)}
            className="collapsible-header"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '32px', 
                height: '32px', 
                backgroundColor: '#f3f4f6', 
                borderRadius: '50%', 
                color: '#374151', 
                fontWeight: '500' 
              }}>
                1
              </span>
              <span style={{ fontWeight: '500', color: '#111827' }}>Tag installation</span>
            </div>
            {expandedStep === 1 ? (
              <ChevronUp className="icon" style={{ color: '#9ca3af' }} />
            ) : (
              <ChevronDown className="icon" style={{ color: '#9ca3af' }} />
            )}
          </button>

          {expandedStep === 1 && (
            <div className="collapsible-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Trial Notice */}
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ flexShrink: 0 }}>
                    <svg className="icon" style={{ color: '#92400e' }} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#78350f', fontWeight: '500', marginBottom: '0.25rem' }}>
                      You have a 15-day free trial waiting for you!
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#92400e' }}>
                      After installing the code, you and your team will have free access to more advanced features, like AI and frustration score.
                      After that, you'll go back to the Free plan. No card needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* SDK Version Selector */}
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', marginBottom: '0.5rem', display: 'block' }}>SDK Version:</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="sdkVersion"
                      value="rrweb"
                      checked={sdkVersion === 'rrweb'}
                      onChange={(e) => setSdkVersion(e.target.value as 'rrweb')}
                      style={{ accentColor: '#9333ea' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                      With Visual Replay (rrweb) ⭐ Recommended
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="sdkVersion"
                      value="basic"
                      checked={sdkVersion === 'basic'}
                      onChange={(e) => setSdkVersion(e.target.value as 'basic')}
                      style={{ accentColor: '#9333ea' }}
                    />
                    <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                      Basic (Events only)
                    </span>
                  </label>
                </div>
              </div>

              {/* Step 1.1 */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flexShrink: 0, width: '24px', height: '24px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', color: '#374151' }}>
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.75rem' }}>Copy the code.</p>
                  {projects.length === 0 ? (
                    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>No projects yet. Create a project first.</p>
                      <a href="/dashboard/projects" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                        Go to Projects
                      </a>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
                      <pre style={{ 
                        fontSize: '0.75rem', 
                        color: '#1f2937', 
                        fontFamily: 'monospace', 
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0
                      }}>
                        {sdkVersion === 'rrweb' ? `<!-- Load rrweb for visual session replay -->
<script src="https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"></script>

<!-- UXCam SDK Configuration -->
<script>
  window.UXCamSDK = {
    key: '${sdkKey}',
    apiUrl: 'http://localhost:3001'
  };
</script>

<!-- Load UXCam SDK with DOM recording -->
<script src="http://localhost:5173/uxcam-sdk-rrweb.js" async></script>` : `<script>
  (function() {
    window.UXCamSDK = {
      key: '${sdkKey}',
      apiUrl: 'http://localhost:3001'
    };
    var script = document.createElement('script');
    script.src = '/uxcam-sdk.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`}
                      </pre>
                      <button
                        onClick={handleCopyCode}
                        className="btn-primary"
                        style={{ marginLeft: '1rem' }}
                      >
                        {copiedCode ? (
                          <>
                            <Check className="icon-small" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="icon-small" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 1.2 */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flexShrink: 0, width: '24px', height: '24px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', color: '#374151' }}>
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', color: '#374151' }}>
                    Paste the code into the &lt;head&gt; of every page where you want to track user behavior or collect feedback.
                  </p>
                </div>
              </div>

              {/* Step 1.3 */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flexShrink: 0, width: '24px', height: '24px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', color: '#374151' }}>
                  3
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', color: '#374151' }}>
                    To make sure everything is ready, verify that your code was installed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Steps (collapsed) */}
        {[2, 3, 4].map((stepNum) => (
          <div key={stepNum} className="collapsible-section">
            <button
              onClick={() => toggleStep(stepNum)}
              className="collapsible-header"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '50%', 
                  color: '#374151', 
                  fontWeight: '500' 
                }}>
                  {stepNum}
                </span>
                <span style={{ fontWeight: '500', color: '#111827' }}>Step {stepNum}</span>
              </div>
              {expandedStep === stepNum ? (
                <ChevronUp className="icon" style={{ color: '#9ca3af' }} />
              ) : (
                <ChevronDown className="icon" style={{ color: '#9ca3af' }} />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

