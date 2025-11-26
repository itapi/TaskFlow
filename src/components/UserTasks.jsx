import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '../utils/api'
import { showErrorToast } from '../utils/toastHelpers'
import MyTasks from './MyTasks'
import Loader from './Loader'

function UserTasks() {
  const { userId } = useParams()
  const { t } = useTranslation()
  const [viewingUser, setViewingUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [userId])

  const loadUser = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getUsers()
      if (response.success) {
        const user = response.data.find(u => u.id === parseInt(userId))
        if (user) {
          setViewingUser(user)
        } else {
          showErrorToast(t('users.userNotFound'))
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      showErrorToast(t('users.loadUserFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader text={t('users.loadingUser')} />
      </div>
    )
  }

  if (!viewingUser) {
    return (
      <div className="p-8 h-full overflow-y-auto bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('users.userNotFound')}</h3>
          <p className="text-gray-600">{t('users.userNotFoundMessage')}</p>
        </div>
      </div>
    )
  }

  return <MyTasks userId={parseInt(userId)} viewingUser={viewingUser} />
}

export default UserTasks
