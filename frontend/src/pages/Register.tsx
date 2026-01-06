import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

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
    <div className="register-page">
      <div className="register-container">
        {/* Logo/Header */}
        <div className="register-header">
          <Link to="/" className="register-logo">
            UX<span className="logo-x">C</span>am
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
            <form className="register-form" onSubmit={handleSubmit}>
              {/* Full Name */}
              <div className="form-group">
                <label htmlFor="fullName" className="form-label">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="••••••••"
                  minLength={6}
                />
                <small className="form-hint">Must be at least 6 characters</small>
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="register-submit-btn"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
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
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Register

