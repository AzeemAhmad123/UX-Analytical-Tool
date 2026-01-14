import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { auth } from '../config/supabase'
import '../App.css'
import './Register.css'

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const navigate = useNavigate()
  
  const pageRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
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
      const header = containerRef.current?.querySelector('.register-header')
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
    setSuccess(false)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const { data, error: signUpError } = await auth.signUp(
        formData.email,
        formData.password,
        {
          name: formData.fullName
        }
      )

      if (signUpError) {
        // Handle specific Supabase errors
        if (signUpError.message?.includes('already registered')) {
          setError('An account with this email already exists')
        } else if (signUpError.message?.includes('Invalid email')) {
          setError('Please enter a valid email address')
        } else if (signUpError.message?.includes('Password')) {
          setError('Password does not meet requirements')
        } else {
          setError(signUpError.message || 'Failed to create account')
        }
        return
      }

      if (data.user) {
        setSuccess(true)
        // Show success message and redirect after a delay
        setTimeout(() => {
          // If email confirmation is required, show message
          if (data.session === null) {
            alert('Please check your email to confirm your account before logging in.')
          }
          navigate('/login')
        }, 2000)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={pageRef} className="register-page">
      <div ref={containerRef} className="register-container">
        {/* Logo/Header */}
        <div className="register-header">
          <Link to="/" className="register-logo">
            <span className="logo-text">UX</span>
            <span className="logo-accent">Cam</span>
          </Link>
          <h2 className="register-title">Create Your Account</h2>
          <p className="register-subtitle">
            Start tracking user journeys today
          </p>
        </div>

        {/* Register Form */}
        <div className="register-form-container">
          {success ? (
            <div className="success-message">
              <svg className="success-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h3>Account Created Successfully!</h3>
              <p>Redirecting to login page...</p>
            </div>
          ) : (
            <form ref={formRef} className="register-form" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">
                  <User size={16} className="label-icon" />
                  Full Name
                </label>
                <div className={`input-wrapper ${focusedField === 'fullName' ? 'focused' : ''} ${formData.fullName ? 'has-value' : ''}`}>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('fullName')}
                    onBlur={() => setFocusedField(null)}
                    className="form-input"
                    placeholder="John Doe"
                  />
                  <div className="input-border"></div>
                </div>
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <Mail size={16} className="label-icon" />
                  Email Address
                </label>
                <div className={`input-wrapper ${focusedField === 'email' ? 'focused' : ''} ${formData.email ? 'has-value' : ''}`}>
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
                    minLength={6}
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
                <small className="form-hint">Must be at least 6 characters</small>
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  <Lock size={16} className="label-icon" />
                  Confirm Password
                </label>
                <div className={`input-wrapper ${focusedField === 'confirmPassword' ? 'focused' : ''} ${formData.confirmPassword ? 'has-value' : ''}`}>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    className="form-input"
                    placeholder="••••••••"
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                  className={`register-submit-btn ${loading ? 'loading' : ''}`}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Sign In Link */}
          <div className="signin-link">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="signin-link-text">
                Sign in
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

export default Register

