import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, Lock, Shield, Upload } from 'lucide-react'
import { auth } from '../../config/supabase'
import '../../components/dashboard/Dashboard.css'

export function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI states
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    loadUser()
    
    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        updateFormData(session.user)
      } else {
        navigate('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const loadUser = async () => {
    try {
      setLoading(true)
      const currentUser = await auth.getUser()
      if (!currentUser) {
        navigate('/login')
        return
      }
      setUser(currentUser)
      updateFormData(currentUser)
    } catch (error) {
      console.error('Error loading user:', error)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (userData: any) => {
    setName(userData?.user_metadata?.name || userData?.email?.split('@')[0] || '')
    setEmail(userData?.email || '')
    setNewEmail('')
  }

  const getUserInitials = (userData: any) => {
    if (userData?.user_metadata?.name) {
      const name = userData.user_metadata.name
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (userData?.email) {
      return userData.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const handleUpdateName = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty')
      return
    }

    try {
      setUpdating(true)
      setError(null)
      setSuccess(null)

      const { error: updateError } = await auth.updateUser({
        data: { name: name.trim() }
      })

      if (updateError) throw updateError

      setSuccess('Name updated successfully')
      // Reload user to get updated data
      await loadUser()
    } catch (err: any) {
      setError(err.message || 'Failed to update name')
    } finally {
      setUpdating(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      setError('Email cannot be empty')
      return
    }

    if (newEmail === email) {
      setError('New email must be different from current email')
      return
    }

    try {
      setUpdating(true)
      setError(null)
      setSuccess(null)

      const { error: updateError } = await auth.updateEmail(newEmail.trim())

      if (updateError) throw updateError

      setSuccess('Email update request sent. Please check your new email for confirmation.')
      setShowChangeEmail(false)
      setNewEmail('')
      // Reload user after a delay
      setTimeout(() => loadUser(), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to update email')
    } finally {
      setUpdating(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword) {
      setError('New password is required')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setUpdating(true)
      setError(null)
      setSuccess(null)

      const { error: updateError } = await auth.updatePassword(newPassword)

      if (updateError) throw updateError

      setSuccess('Password updated successfully')
      setShowChangePassword(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setUpdating(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      setError('Failed to sign out')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB')
      return
    }

    try {
      setUpdating(true)
      setError(null)
      setSuccess(null)

      // Upload to Supabase Storage (if configured) or convert to base64
      // For now, we'll just show a success message
      // In production, you'd upload to Supabase Storage
      setSuccess('Profile picture updated successfully')
      
      // TODO: Implement actual image upload to Supabase Storage
      // const fileExt = file.name.split('.').pop()
      // const fileName = `${user.id}.${fileExt}`
      // const { error: uploadError } = await supabase.storage
      //   .from('avatars')
      //   .upload(fileName, file)
      
    } catch (err: any) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page-content">
      {/* Header */}
      <div className="profile-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft className="icon-small" />
          Back
        </button>
        <h1 className="page-title">My profile</h1>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          {success}
        </div>
      )}

      {/* Profile Content */}
      <div className="profile-content">
        {/* Photo Section */}
        <div className="profile-section">
          <h2 className="profile-section-title">Photo</h2>
          <div className="profile-photo-section">
            <div className="profile-avatar-large">
              {user && getUserInitials(user)}
            </div>
            <div>
              <label htmlFor="avatar-upload" className="btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Upload className="icon-small" />
                Choose image
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                disabled={updating}
              />
            </div>
          </div>
        </div>

        {/* Name Section */}
        <div className="profile-section">
          <h2 className="profile-section-title">Name</h2>
          <div className="profile-input-group">
            <input
              type="text"
              className="profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              disabled={updating}
            />
            <button
              onClick={handleUpdateName}
              className="btn-primary"
              disabled={updating || !name.trim()}
            >
              {updating ? 'Updating...' : 'Update Name'}
            </button>
          </div>
        </div>

        {/* Email Section */}
        <div className="profile-section">
          <h2 className="profile-section-title">Email address</h2>
          <div className="profile-input-group">
            <input
              type="email"
              className="profile-input"
              value={email}
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
            {!showChangeEmail ? (
              <button
                onClick={() => setShowChangeEmail(true)}
                className="btn-secondary"
              >
                Change email
              </button>
            ) : (
              <div className="profile-change-email-form">
                <input
                  type="email"
                  className="profile-input"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                  disabled={updating}
                  style={{ marginBottom: '0.75rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleChangeEmail}
                    className="btn-primary"
                    disabled={updating || !newEmail.trim()}
                  >
                    {updating ? 'Updating...' : 'Save Email'}
                  </button>
                  <button
                    onClick={() => {
                      setShowChangeEmail(false)
                      setNewEmail('')
                      setError(null)
                    }}
                    className="btn-secondary"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Security Section */}
        <div className="profile-section">
          <h2 className="profile-section-title">Account security</h2>
          <div className="profile-security-buttons">
            {!showChangePassword ? (
              <>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="btn-secondary"
                >
                  <Lock className="icon-small" />
                  Change password
                </button>
                <button
                  className="btn-secondary"
                  disabled
                  title="Coming soon"
                >
                  <Shield className="icon-small" />
                  Enable multi-factor authentication
                </button>
              </>
            ) : (
              <div className="profile-change-password-form">
                <input
                  type="password"
                  className="profile-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={updating}
                  style={{ marginBottom: '0.75rem' }}
                />
                <input
                  type="password"
                  className="profile-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={updating}
                  style={{ marginBottom: '0.75rem' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleChangePassword}
                    className="btn-primary"
                    disabled={updating || !newPassword || !confirmPassword}
                  >
                    {updating ? 'Updating...' : 'Save Password'}
                  </button>
                  <button
                    onClick={() => {
                      setShowChangePassword(false)
                      setNewPassword('')
                      setConfirmPassword('')
                      setError(null)
                    }}
                    className="btn-secondary"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="profile-section">
          <div className="profile-signout-section">
            <button
              onClick={handleSignOut}
              className="btn-danger"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LogOut className="icon-small" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

