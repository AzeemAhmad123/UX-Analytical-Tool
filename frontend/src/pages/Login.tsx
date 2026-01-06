import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

    try {
      const { data, error: signInError } = await auth.signIn(formData.email, formData.password)

      if (signInError) {
        // Handle specific Supabase errors
        if (signInError.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password')
        } else if (signInError.message?.includes('Email not confirmed')) {
          setError('Please verify your email before logging in')
        } else {
          setError(signInError.message || 'Failed to sign in')
        }
        return
      }

      if (data.user) {
        // Successfully logged in
        navigate('/dashboard') // Redirect to dashboard (you'll need to create this)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Logo/Header */}
        <div className="login-header">
          <Link to="/" className="login-logo">
            UX<span className="logo-x">C</span>am
          </Link>
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <div className="login-form-container">
          <form className="login-form" onSubmit={handleSubmit}>
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
              />
            </div>

            {/* Forgot Password Link */}
            <div className="forgot-password">
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
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
              className="login-submit-btn"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
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
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login

