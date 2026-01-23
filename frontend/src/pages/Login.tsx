import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react'
import { auth } from '../config/supabase'
import '../App.css'
import './Login.css'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const navigate = useNavigate()
  
  const pageRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    // Clear any stored email/password from localStorage or sessionStorage
    // This prevents showing previously entered credentials
    const clearStoredCredentials = () => {
      // Clear any email-related storage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.toLowerCase().includes('email') || key.toLowerCase().includes('login'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Also clear sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.toLowerCase().includes('email') || key.toLowerCase().includes('login'))) {
          sessionStorage.removeItem(key)
        }
      }
      
      // Ensure form is empty
      setFormData({
        email: '',
        password: ''
      })
    }
    
    clearStoredCredentials()

    const ctx = gsap.context(() => {
      // Animate page entrance
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out'
      })

      // Animate form elements
      if (formRef.current) {
        const formElements = formRef.current.children
        gsap.from(formElements, {
          opacity: 0,
          x: -20,
          duration: 0.6,
          stagger: 0.1,
          delay: 0.3,
          ease: 'power3.out'
        })
      }

      // Animate header
      const header = containerRef.current?.querySelector('.login-header')
      if (header) {
        gsap.from(header.children, {
          opacity: 0,
          y: -20,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out'
        })
      }
    }, pageRef)

    return () => ctx.revert()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError(null) // Clear error when user types
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email || !emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    // Validate password
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // Trim email to remove whitespace
      const trimmedEmail = formData.email.trim().toLowerCase()
      
      // Add timeout for login (10 seconds max)
      const loginPromise = auth.signIn(trimmedEmail, formData.password)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout - please check your internet connection')), 10000)
      )
      
      const { data, error: signInError } = await Promise.race([loginPromise, timeoutPromise]) as any

      if (signInError) {
        console.error('Supabase auth error:', signInError)
        
        // Handle specific Supabase errors
        if (signInError.message?.includes('Invalid login credentials') || 
            signInError.message?.includes('invalid') ||
            signInError.status === 400) {
          setError('Invalid email or password. Please check your credentials and try again.')
        } else if (signInError.message?.includes('Email not confirmed')) {
          setError('Please verify your email before logging in')
        } else if (signInError.status === 422) {
          setError('Invalid email or password format. Please check your input.')
        } else {
          setError(signInError.message || 'Failed to sign in. Please try again.')
        }
        setLoading(false)
        return
      }

      if (data?.user) {
        // Successfully logged in - navigate immediately (don't wait for dashboard to load)
        // Dashboard will load data in background
        setLoading(false) // Stop loading spinner before navigation
        navigate('/dashboard', { replace: true }) // Use replace to avoid back button issues
      } else {
        setError('Login failed. Please try again.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.message?.includes('timeout')) {
        setError('Login is taking too long. Please check your internet connection and try again.')
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        setError('Network error. Please check your internet connection and try again.')
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div ref={pageRef} className="login-page">
      <div ref={containerRef} className="login-container">
        {/* Logo/Header */}
        <div className="login-header">
          <Link to="/" className="login-logo">
            <span className="logo-text">UX</span>
            <span className="logo-accent">Cam</span>
          </Link>
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="login-form-container">
          <form ref={formRef} className="login-form" onSubmit={handleSubmit} autoComplete="off">
            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <Mail size={16} className="label-icon" />
                Email Address
              </label>
              <div className={`input-wrapper ${focusedField === 'email' ? 'focused' : ''} ${formData.email ? 'has-value' : ''}`}>
                {/* Hidden fake email field to trick browser autofill */}
                <input
                  type="email"
                  name="fake-email"
                  autoComplete="off"
                  style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
                  tabIndex={-1}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="form-input"
                  placeholder="you@example.com"
                  autoComplete="new-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <div className="input-border"></div>
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock size={16} className="label-icon" />
                Password
              </label>
              <div className={`input-wrapper ${focusedField === 'password' ? 'focused' : ''} ${formData.password ? 'has-value' : ''}`}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="form-input"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="input-border"></div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="error-icon">
                  <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M10 6V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M10 14H10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="submit-button-wrapper">
              <button
                type="submit"
                disabled={loading}
                className={`login-submit-btn ${loading ? 'loading' : ''}`}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="forgot-password">
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="signup-link">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="signup-link-text">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="back-home">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} />
            <span>Back to home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login

