import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings as SettingsIcon, User, Lock, Save, AlertCircle } from 'lucide-react'
import apiClient from '../utils/api'
import { showSuccessToast, showErrorToast } from '../utils/toastHelpers'
import { useUser } from '../contexts/GlobalStateContext'
import Loader from './Loader'

function Settings() {
  const { t } = useTranslation()
  const { user, updateUser } = useUser()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    username: '',
    full_name: '',
    email: ''
  })

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        full_name: user.full_name || '',
        email: user.email || ''
      })
    }
  }, [user])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()

    try {
      setSaving(true)
      const response = await apiClient.updateUser(user.id, profileForm)

      if (response.success) {
        showSuccessToast(t('settings.profileUpdatedSuccess'))
        updateUser(profileForm)
      }
    } catch (error) {
      showErrorToast(error.message || t('settings.profileUpdateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()

    // Validate passwords
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showErrorToast(t('settings.passwordsDoNotMatch'))
      return
    }

    if (passwordForm.new_password.length < 6) {
      showErrorToast(t('settings.passwordTooShort'))
      return
    }

    try {
      setSaving(true)
      const response = await apiClient.updateUser(user.id, {
        password: passwordForm.new_password
      })

      if (response.success) {
        showSuccessToast(t('settings.passwordUpdatedSuccess'))
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: ''
        })
      }
    } catch (error) {
      showErrorToast(error.message || t('settings.passwordUpdateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'password', label: t('settings.password'), icon: Lock }
  ]

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader text={t('settings.loadingSettings')} />
      </div>
    )
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
            <p className="text-gray-600">{t('settings.manageAccount')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.username')}
                  </label>
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {t('settings.usernameHelp')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.fullName')}
                  </label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {t('settings.fullNameHelp')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.email')}
                  </label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {t('settings.emailHelp')}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? t('settings.saving') : t('settings.saveChanges')}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                      {t('settings.passwordSecurity')}
                    </h4>
                    <p className="text-sm text-yellow-700">
                      {t('settings.passwordSecurityMessage')}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    minLength={6}
                    placeholder={t('settings.enterNewPassword')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.confirmNewPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    minLength={6}
                    placeholder={t('settings.confirmNewPasswordPlaceholder')}
                  />
                  {passwordForm.new_password && passwordForm.confirm_password &&
                   passwordForm.new_password !== passwordForm.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">
                      {t('settings.passwordsDoNotMatch')}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving || (passwordForm.new_password !== passwordForm.confirm_password)}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock className="w-5 h-5" />
                    <span>{saving ? t('settings.updating') : t('settings.updatePassword')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.accountInformation')}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('settings.accountId')}</span>
              <span className="text-gray-900 font-medium">{user.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('users.role')}</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 capitalize">
                {user.role}
              </span>
            </div>
            {user.created_at && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t('settings.memberSince')}</span>
                <span className="text-gray-900 font-medium">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            )}
            {user.last_login && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t('settings.lastLogin')}</span>
                <span className="text-gray-900 font-medium">
                  {new Date(user.last_login).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
