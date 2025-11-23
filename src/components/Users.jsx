import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Users as UsersIcon, Plus, Edit2, Trash2, Mail, Shield, CheckSquare } from 'lucide-react'
import apiClient from '../utils/api'
import { showSuccessToast, showErrorToast } from '../utils/toastHelpers'
import { useModal, useUser } from '../contexts/GlobalStateContext'
import Loader from './Loader'

function Users() {
  const { t } = useTranslation()
  const { openModal } = useModal()
  const { user: currentUser } = useUser()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getUsers()
      if (response.success) {
        setUsers(response.data || [])
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      showErrorToast(t('users.loadUsersFailed'))
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = () => {
    return currentUser?.role === 'admin'
  }

  const handleCreateUser = () => {
    if (!isAdmin()) {
      showErrorToast(t('users.onlyAdminsCanCreate'))
      return
    }

    openModal({
      title: t('users.createNewUser'),
      layout: 'form',
      size: 'md',
      data: {
        fields: [
          {
            name: 'username',
            label: t('users.username'),
            type: 'text',
            required: true,
            placeholder: t('users.enterUsername')
          },
          {
            name: 'full_name',
            label: t('users.fullName'),
            type: 'text',
            required: true,
            placeholder: t('users.enterFullName')
          },
          {
            name: 'email',
            label: t('users.email'),
            type: 'email',
            required: true,
            placeholder: t('users.enterEmail')
          },
          {
            name: 'password',
            label: t('users.password'),
            type: 'password',
            required: true,
            placeholder: t('users.enterPassword')
          },
          {
            name: 'role',
            label: t('users.role'),
            type: 'select',
            defaultValue: 'member',
            options: [
              { value: 'admin', label: t('users.roles.administrator') },
              { value: 'manager', label: t('users.roles.manager') },
              { value: 'member', label: t('users.roles.member') }
            ]
          }
        ],
        onSubmit: async (formData) => {
          try {
            const response = await apiClient.createUser(formData)
            if (response.success) {
              showSuccessToast(t('users.userCreatedSuccess'))
              loadUsers()
            }
          } catch (error) {
            showErrorToast(error.message || t('users.userCreateFailed'))
            throw error
          }
        }
      },
      showConfirmButton: true,
      showCancelButton: true,
      confirmText: t('common.create'),
      cancelText: t('common.cancel')
    })
  }

  const handleEditUser = (user) => {
    if (!isAdmin()) {
      showErrorToast(t('users.onlyAdminsCanEdit'))
      return
    }

    openModal({
      title: t('users.editUser'),
      layout: 'form',
      size: 'md',
      data: {
        fields: [
          {
            name: 'username',
            label: t('users.username'),
            type: 'text',
            required: true,
            defaultValue: user.username
          },
          {
            name: 'full_name',
            label: t('users.fullName'),
            type: 'text',
            required: true,
            defaultValue: user.full_name || ''
          },
          {
            name: 'email',
            label: t('users.email'),
            type: 'email',
            required: true,
            defaultValue: user.email || ''
          },
          {
            name: 'password',
            label: t('users.passwordLeaveEmpty'),
            type: 'password',
            placeholder: t('users.enterNewPassword')
          },
          {
            name: 'role',
            label: t('users.role'),
            type: 'select',
            defaultValue: user.role,
            options: [
              { value: 'admin', label: t('users.roles.administrator') },
              { value: 'manager', label: t('users.roles.manager') },
              { value: 'member', label: t('users.roles.member') }
            ]
          }
        ],
        onSubmit: async (formData) => {
          try {
            // Remove password field if empty
            if (!formData.password) {
              delete formData.password
            }

            const response = await apiClient.updateUser(user.id, formData)
            if (response.success) {
              showSuccessToast(t('users.userUpdatedSuccess'))
              loadUsers()
            }
          } catch (error) {
            showErrorToast(error.message || t('users.userUpdateFailed'))
            throw error
          }
        }
      },
      showConfirmButton: true,
      showCancelButton: true,
      confirmText: t('common.save'),
      cancelText: t('common.cancel')
    })
  }

  const handleDeleteUser = (user) => {
    if (!isAdmin()) {
      showErrorToast(t('users.onlyAdminsCanDelete'))
      return
    }

    if (user.id === currentUser?.id) {
      showErrorToast(t('users.cannotDeleteSelf'))
      return
    }

    openModal({
      title: t('users.deleteUser'),
      layout: 'confirmAction',
      size: 'sm',
      data: {
        message: t('users.deleteUserConfirm', { name: user.full_name || user.username }),
        variant: 'danger'
      },
      showConfirmButton: true,
      showCancelButton: true,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await apiClient.deleteUser(user.id)
          if (response.success) {
            showSuccessToast(t('users.userDeletedSuccess'))
            loadUsers()
          }
        } catch (error) {
          showErrorToast(error.message || t('users.userDeleteFailed'))
          throw error
        }
      }
    })
  }

  const getRoleBadgeColor = (role) => {
    const colors = {
      'admin': 'bg-red-100 text-red-700 border-red-200',
      'manager': 'bg-blue-100 text-blue-700 border-blue-200',
      'member': 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getRoleLabel = (role) => {
    const labels = {
      'admin': t('users.roles.administrator'),
      'manager': t('users.roles.manager'),
      'member': t('users.roles.member')
    }
    return labels[role] || role
  }

  const getRoleIcon = (role) => {
    if (role === 'admin') {
      return <Shield className="w-4 h-4" />
    }
    return null
  }

  const getUserInitials = (user) => {
    const name = user.full_name || user.username || 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0]
    }
    return name.substring(0, 2).toUpperCase()
  }

  const formatDate = (dateString) => {
    if (!dateString) return t('common.never')
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader text={t('users.loadingUsers')} />
      </div>
    )
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('users.teamMembers')}</h1>
              <p className="text-gray-600">{t('users.manageTeam')}</p>
            </div>
          </div>
          {isAdmin() && (
            <button
              onClick={handleCreateUser}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>{t('users.addUser')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Grid */}
      {users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('users.noUsers')}</h3>
          <p className="text-gray-600">{t('users.noUsersShouldntHappen')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              {/* User Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg font-semibold">
                        {getUserInitials(user)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {user.full_name || user.username}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                    </div>
                  </div>
                  {isAdmin() && user.id !== currentUser?.id && (
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title={t('users.editUserTitle')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('users.deleteUserTitle')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Role Badge */}
                <div className="flex items-center space-x-2">
                  <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                    {getRoleIcon(user.role)}
                    <span>{getRoleLabel(user.role)}</span>
                  </div>
                  {user.id === currentUser?.id && (
                    <span className="text-xs text-gray-500">{t('users.youLabel')}</span>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="p-6 bg-gray-50 space-y-3">
                {user.email && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 truncate">{user.email}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2 text-sm">
                  <CheckSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">
                    {user.task_count || 0} {t('users.activeTasks')}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {t('users.joined')} {formatDate(user.created_at)}
                  </p>
                  {user.last_login && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('users.lastLoginLabel')}: {formatDate(user.last_login)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      {!isAdmin() && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">{t('users.limitedAccess')}</h4>
              <p className="text-sm text-blue-700">
                {t('users.limitedAccessMessage')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
