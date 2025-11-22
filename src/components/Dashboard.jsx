import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '../contexts/GlobalStateContext'
import {
  FolderKanban,
  CheckSquare,
  Users,
  AlertCircle,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react'
import apiClient from '../utils/api'
import { showSuccessToast, showErrorToast } from '../utils/toastHelpers'
import Loader from './Loader'

function Dashboard() {
  const { user } = useUser()
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await apiClient.getStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
      showErrorToast(t('messages.error'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader text={t('common.loading')} />
      </div>
    )
  }

  const statCards = [
    {
      title: t('dashboard.totalProjects'),
      value: stats?.total_projects || 0,
      icon: FolderKanban,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: t('dashboard.totalTasks'),
      value: stats?.total_tasks || 0,
      icon: CheckSquare,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600'
    },
    {
      title: t('dashboard.teamMembers'),
      value: stats?.total_users || 0,
      icon: Users,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: t('dashboard.overdueTasks'),
      value: stats?.overdue_tasks || 0,
      icon: AlertCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    }
  ]

  const getStatusColor = (status) => {
    const colors = {
      'backlog': 'bg-gray-100 text-gray-700',
      'not_started': 'bg-yellow-100 text-yellow-700',
      'in_progress': 'bg-blue-100 text-blue-700',
      'review': 'bg-purple-100 text-purple-700',
      'done': 'bg-green-100 text-green-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status) => {
    return t(`tasks.statuses.${status}`, status)
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-green-100 text-green-700',
      'medium': 'bg-yellow-100 text-yellow-700',
      'high': 'bg-orange-100 text-orange-700',
      'urgent': 'bg-red-100 text-red-700'
    }
    return colors[priority] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('auth.welcomeBack')}, {user?.full_name || user?.username || 'User'}!
            </h1>
            <p className="text-gray-600">{t('dashboard.overview')}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.title}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tasks by Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-indigo-600" />
            {t('dashboard.tasksByStatus')}
          </h2>
          <div className="space-y-3">
            {stats?.tasks_by_status && Object.entries(stats.tasks_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {getStatusLabel(status)}
                  </div>
                </div>
                <span className="text-lg font-semibold text-gray-900">{count}</span>
              </div>
            ))}
            {(!stats?.tasks_by_status || Object.keys(stats.tasks_by_status).length === 0) && (
              <p className="text-gray-500 text-sm text-center py-4">{t('dashboard.noTasksYet')}</p>
            )}
          </div>
        </div>

        {/* Tasks by Priority */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-indigo-600" />
            {t('dashboard.tasksByPriority')}
          </h2>
          <div className="space-y-3">
            {stats?.tasks_by_priority && Object.entries(stats.tasks_by_priority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getPriorityColor(priority)}`}>
                    {t(`tasks.priorities.${priority}`, priority)}
                  </div>
                </div>
                <span className="text-lg font-semibold text-gray-900">{count}</span>
              </div>
            ))}
            {(!stats?.tasks_by_priority || Object.keys(stats.tasks_by_priority).length === 0) && (
              <p className="text-gray-500 text-sm text-center py-4">{t('dashboard.noTasksYet')}</p>
            )}
          </div>
        </div>
      </div>

      {/* My Tasks Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">{t('dashboard.myTasks')}</h3>
            <CheckSquare className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{stats?.my_tasks?.total || 0}</p>
          <p className="text-xs text-blue-700 mt-1">{t('dashboard.assignedToMe')}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-900">{t('dashboard.completed')}</h3>
            <CheckSquare className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{stats?.my_tasks?.completed || 0}</p>
          <p className="text-xs text-green-700 mt-1">{t('dashboard.tasksDone')}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-red-900">{t('dashboard.overdue')}</h3>
            <Clock className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">{stats?.my_tasks?.overdue || 0}</p>
          <p className="text-xs text-red-700 mt-1">{t('dashboard.needAttention')}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-indigo-600" />
          {t('dashboard.upcomingDeadlines')}
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <span className="text-sm text-yellow-900">{t('dashboard.dueThisWeek')}</span>
            <span className="text-lg font-bold text-yellow-900">{stats?.due_this_week || 0}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <span className="text-sm text-red-900">{t('dashboard.overdueTasks')}</span>
            <span className="text-lg font-bold text-red-900">{stats?.overdue_tasks || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
