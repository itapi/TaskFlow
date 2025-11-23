import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckSquare, Filter, Calendar, AlertCircle,
  FolderKanban, Edit2, Trash2, Clock, List, LayoutGrid, Flag
} from 'lucide-react'
import apiClient from '../utils/api'
import { showSuccessToast, showErrorToast } from '../utils/toastHelpers'
import { useModal, useUser } from '../contexts/GlobalStateContext'
import Loader from './Loader'
import { Table } from './Table/Table'

function MyTasks() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { openModal } = useModal()
  const { user } = useUser()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    project: 'all'
  })
  const [viewMode, setViewMode] = useState('cards') // 'cards' or 'table'

  useEffect(() => {
    loadData()
  }, [user?.id])

  const statuses = [
    { id: 'backlog', label: t('tasks.statuses.backlog'), color: 'gray' },
    { id: 'not_started', label: t('tasks.statuses.not_started'), color: 'yellow' },
    { id: 'in_progress', label: t('tasks.statuses.in_progress'), color: 'blue' },
    { id: 'review', label: t('tasks.statuses.review'), color: 'purple' },
    { id: 'done', label: t('tasks.statuses.done'), color: 'green' }
  ]

  const loadData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        apiClient.getTasks({ assigned_to: user.id }),
        apiClient.getProjects(),
        apiClient.getUsers()
      ])

      if (tasksRes.success) {
        setTasks(tasksRes.data || [])
      }
      if (projectsRes.success) {
        setProjects(projectsRes.data || [])
      }
      if (usersRes.success) {
        setUsers(usersRes.data || [])
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
      showErrorToast(t('tasks.taskUpdateFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleEditTask = (task) => {
    openModal({
      title: t('tasks.editTask'),
      layout: 'form',
      size: 'lg',
      data: {
        fields: [
          {
            name: 'title',
            label: t('tasks.taskTitle'),
            type: 'text',
            required: true,
            defaultValue: task.title
          },
          {
            name: 'description',
            label: t('tasks.description'),
            type: 'textarea',
            defaultValue: task.description || ''
          },
          {
            name: 'status',
            label: t('tasks.status'),
            type: 'select',
            defaultValue: task.status,
            options: [
              { value: 'backlog', label: t('tasks.statuses.backlog') },
              { value: 'not_started', label: t('tasks.statuses.not_started') },
              { value: 'in_progress', label: t('tasks.statuses.in_progress') },
              { value: 'review', label: t('tasks.statuses.review') },
              { value: 'done', label: t('tasks.statuses.done') }
            ]
          },
          {
            name: 'priority',
            label: t('tasks.priority'),
            type: 'select',
            defaultValue: task.priority,
            options: [
              { value: 'low', label: t('tasks.priorities.low') },
              { value: 'medium', label: t('tasks.priorities.medium') },
              { value: 'high', label: t('tasks.priorities.high') },
              { value: 'urgent', label: t('tasks.priorities.urgent') }
            ]
          },
          {
            name: 'due_date',
            label: t('tasks.dueDate'),
            type: 'date',
            defaultValue: task.due_date || ''
          }
        ],
        onSubmit: async (formData) => {
          try {
            const response = await apiClient.updateTask(task.id, formData)
            if (response.success) {
              showSuccessToast(t('tasks.taskUpdatedSuccess'))
              loadData()
            }
          } catch (error) {
            showErrorToast(error.message || t('tasks.taskUpdateFailed'))
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

  const handleDeleteTask = (task) => {
    openModal({
      title: t('tasks.deleteTask'),
      layout: 'confirmAction',
      size: 'sm',
      data: {
        message: t('tasks.deleteTaskConfirm', { title: task.title }),
        variant: 'danger'
      },
      showConfirmButton: true,
      showCancelButton: true,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await apiClient.deleteTask(task.id)
          if (response.success) {
            showSuccessToast(t('tasks.taskDeletedSuccess'))
            loadData()
          }
        } catch (error) {
          showErrorToast(error.message || t('tasks.taskDeleteFailed'))
          throw error
        }
      }
    })
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await apiClient.updateTaskStatus(taskId, newStatus)
      if (response.success) {
        showSuccessToast(t('tasks.taskStatusUpdatedSuccess'))
        loadData()
      }
    } catch (error) {
      showErrorToast(error.message || t('tasks.taskStatusUpdateFailed'))
    }
  }

  const handleViewTask = (task) => {
    openModal({
      layout: 'taskDetail',
      title: task.title,
      size: 'xl',
      showConfirmButton: false,
      showCancelButton: false,
      data: {
        task,
        users,
        statuses,
        onTaskUpdate: loadData,
        onEditTask: handleEditTask,
        onDeleteTask: handleDeleteTask
      }
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      'backlog': 'bg-gray-100 text-gray-700 border-gray-200',
      'not_started': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'in_progress': 'bg-blue-100 text-blue-700 border-blue-200',
      'review': 'bg-purple-100 text-purple-700 border-purple-200',
      'done': 'bg-green-100 text-green-700 border-green-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'backlog': t('tasks.statuses.backlog'),
      'not_started': t('tasks.statuses.not_started'),
      'in_progress': t('tasks.statuses.in_progress'),
      'review': t('tasks.statuses.review'),
      'done': t('tasks.statuses.done')
    }
    return labels[status] || status
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'text-green-600 bg-green-50 border-green-200',
      'medium': 'text-yellow-600 bg-yellow-50 border-yellow-200',
      'high': 'text-orange-600 bg-orange-50 border-orange-200',
      'urgent': 'text-red-600 bg-red-50 border-red-200'
    }
    return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    const isOverdue = date < today

    return {
      formatted: new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      isOverdue
    }
  }

  const getProject = (projectId) => {
    return projects.find(p => p.id === projectId)
  }

  const getAssignedUser = (userId) => {
    return users.find(u => u.id === userId)
  }

  // Table columns configuration
  const tableColumns = [
    {
      id: 'title',
      key: 'title',
      label: t('tasks.taskTitle'),
      type: 'custom',
      render: (row) => (
        <div className="font-medium text-gray-900">{row.title}</div>
      )
    },
    {
      id: 'project',
      key: 'project_id',
      label: t('common.project'),
      type: 'custom',
      render: (row) => {
        const project = getProject(row.project_id)
        return project ? (
          <span className="text-sm text-gray-600">{project.name}</span>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
      }
    },
    {
      id: 'status',
      key: 'status',
      label: t('tasks.status'),
      type: 'custom',
      render: (row) => {
        const colorClasses = {
          backlog: 'bg-gray-100 text-gray-800',
          not_started: 'bg-yellow-100 text-yellow-800',
          in_progress: 'bg-blue-100 text-blue-800',
          review: 'bg-purple-100 text-purple-800',
          done: 'bg-green-100 text-green-800'
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[row.status] || 'bg-gray-100 text-gray-800'}`}>
            {getStatusLabel(row.status)}
          </span>
        )
      }
    },
    {
      id: 'priority',
      key: 'priority',
      label: t('tasks.priority'),
      type: 'custom',
      render: (row) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium capitalize border ${getPriorityColor(row.priority)}`}>
          <Flag className="w-3 h-3" />
          {t(`tasks.priorities.${row.priority}`)}
        </span>
      )
    },
    {
      id: 'due_date',
      key: 'due_date',
      label: t('tasks.dueDate'),
      type: 'custom',
      render: (row) => {
        const dueDate = formatDate(row.due_date)
        if (!dueDate) {
          return <span className="text-gray-400 text-sm">-</span>
        }
        return (
          <div className={`flex items-center space-x-1 text-xs ${
            dueDate.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
          }`}>
            <Calendar className="w-3 h-3" />
            <span>{dueDate.formatted}</span>
          </div>
        )
      }
    }
  ]

  // Table configuration
  const tableConfig = {
    columns: tableColumns,
    onRowClick: (row) => handleViewTask(row),
    actions: [
      {
        id: 'edit',
        icon: Edit2,
        label: t('common.edit'),
        onClick: (row) => handleEditTask(row),
        className: 'text-gray-600 hover:text-indigo-600'
      },
      {
        id: 'delete',
        icon: Trash2,
        label: t('common.delete'),
        onClick: (row) => handleDeleteTask(row),
        className: 'text-gray-600 hover:text-red-600'
      }
    ],
    emptyMessage: t('common.noTasksFound')
  }

  const filteredTasks = tasks.filter(task => {
    if (filters.status !== 'all' && task.status !== filters.status) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    if (filters.project !== 'all' && task.project_id?.toString() !== filters.project) return false
    return true
  })

  const groupedTasks = {
    overdue: filteredTasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      const dueDate = formatDate(t.due_date)
      return dueDate?.isOverdue
    }),
    today: filteredTasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      const today = new Date().toDateString()
      const taskDate = new Date(t.due_date).toDateString()
      return today === taskDate
    }),
    upcoming: filteredTasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false
      const dueDate = formatDate(t.due_date)
      const today = new Date().toDateString()
      const taskDate = new Date(t.due_date).toDateString()
      return !dueDate?.isOverdue && today !== taskDate
    }),
    noDueDate: filteredTasks.filter(t => !t.due_date && t.status !== 'done'),
    completed: filteredTasks.filter(t => t.status === 'done')
  }

  const TaskCard = ({ task }) => {
    const dueDate = formatDate(task.due_date)
    const project = getProject(task.project_id)

    return (
      <div
        onClick={() => handleViewTask(task)}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all group cursor-pointer"
      >
        {/* Task Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 pr-2">
            <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                {getStatusLabel(task.status)}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium capitalize border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleEditTask(task)
              }}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title={t('tasks.editTaskTitle')}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteTask(task)
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title={t('tasks.deleteTaskTitle')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task Description */}
        {task.description && (
          <div
            className="text-sm text-gray-600 mb-3 line-clamp-2 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: task.description }}
          />
        )}

        {/* Task Meta */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3">
            {project && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/projects/${project.id}`)
                }}
                className="flex items-center space-x-1 text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <FolderKanban className="w-4 h-4" />
                <span className="text-xs">{project.name}</span>
              </button>
            )}
            {dueDate && (
              <div className={`flex items-center space-x-1 ${
                dueDate.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}>
                <Calendar className="w-4 h-4" />
                <span className="text-xs">{dueDate.formatted}</span>
              </div>
            )}
          </div>

          {task.status !== 'done' && (
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="backlog">{t('tasks.statuses.backlog')}</option>
              <option value="not_started">{t('tasks.statuses.not_started')}</option>
              <option value="in_progress">{t('tasks.statuses.in_progress')}</option>
              <option value="review">{t('tasks.statuses.review')}</option>
              <option value="done">{t('tasks.statuses.done')}</option>
            </select>
          )}
        </div>
      </div>
    )
  }

  const TaskSection = ({ title, tasks, icon: Icon, color = "gray" }) => {
    if (tasks.length === 0) return null

    return (
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Icon className={`w-5 h-5 text-${color}-600`} />
          <h2 className="text-lg font-semibold text-gray-900">
            {title}
            <span className="ml-2 text-sm font-normal text-gray-500">({tasks.length})</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader text={t('tasks.loadingProject')} />
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
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('tasks.myTasks')}</h1>
              <p className="text-gray-600">{t('common.tasksAssignedToYou')}</p>
            </div>
          </div>
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={t('common.cards')}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">{t('common.cards')}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={t('common.table')}
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">{t('common.table')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">{t('common.filters')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.status')}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t('common.allStatuses')}</option>
              <option value="backlog">{t('tasks.statuses.backlog')}</option>
              <option value="not_started">{t('tasks.statuses.not_started')}</option>
              <option value="in_progress">{t('tasks.statuses.in_progress')}</option>
              <option value="review">{t('tasks.statuses.review')}</option>
              <option value="done">{t('tasks.statuses.done')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.priority')}</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t('common.allPriorities')}</option>
              <option value="low">{t('tasks.priorities.low')}</option>
              <option value="medium">{t('tasks.priorities.medium')}</option>
              <option value="high">{t('tasks.priorities.high')}</option>
              <option value="urgent">{t('tasks.priorities.urgent')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.project')}</label>
            <select
              value={filters.project}
              onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t('common.allProjects')}</option>
              {projects.map(project => (
                <option key={project.id} value={project.id.toString()}>{project.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Display */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.noTasksFound')}</h3>
          <p className="text-gray-600">{t('common.tryAdjustingFilters')}</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Table
            tableConfig={tableConfig}
            data={filteredTasks}
          />
        </div>
      ) : (
        /* Cards View - Grouped by date */
        <>
          <TaskSection
            title={t('common.overdue')}
            tasks={groupedTasks.overdue}
            icon={AlertCircle}
            color="red"
          />
          <TaskSection
            title={t('common.dueToday')}
            tasks={groupedTasks.today}
            icon={Clock}
            color="orange"
          />
          <TaskSection
            title={t('common.upcoming')}
            tasks={groupedTasks.upcoming}
            icon={Calendar}
            color="blue"
          />
          <TaskSection
            title={t('common.noDueDate')}
            tasks={groupedTasks.noDueDate}
            icon={CheckSquare}
            color="gray"
          />
          <TaskSection
            title={t('dashboard.completed')}
            tasks={groupedTasks.completed}
            icon={CheckSquare}
            color="green"
          />
        </>
      )}
    </div>
  )
}

export default MyTasks
