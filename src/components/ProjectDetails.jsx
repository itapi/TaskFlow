import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight, Plus, Edit2, Trash2, Calendar, User,
  AlertCircle, MessageSquare, Activity, LayoutGrid, List
} from 'lucide-react'
import apiClient from '../utils/api'
import { showSuccessToast, showErrorToast } from '../utils/toastHelpers'
import { useGlobalState } from '../contexts/GlobalStateContext'
import Loader from './Loader'
import { Table } from './Table/Table'

function ProjectDetails() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { openModal, openConfirmModal } = useGlobalState()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('table') // 'table' or 'kanban'

  const statuses = [
    { id: 'backlog', label: t('tasks.statuses.backlog'), color: 'gray' },
    { id: 'not_started', label: t('tasks.statuses.not_started'), color: 'yellow' },
    { id: 'in_progress', label: t('tasks.statuses.in_progress'), color: 'blue' },
    { id: 'review', label: t('tasks.statuses.review'), color: 'purple' },
    { id: 'done', label: t('tasks.statuses.done'), color: 'green' }
  ]

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    try {
      setLoading(true)
      const [projectRes, tasksRes, usersRes] = await Promise.all([
        apiClient.getProject(projectId),
        apiClient.getTasksByProject(projectId),
        apiClient.getUsers()
      ])

      if (projectRes.success) {
        setProject(projectRes.data)
      }
      if (tasksRes.success) {
        setTasks(tasksRes.data || [])
      }
      if (usersRes.success) {
        setUsers(usersRes.data || [])
      }
    } catch (error) {
      console.error('Failed to load project data:', error)
      showErrorToast(t('messages.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = () => {
    openModal({
      layout: 'form',
      title: t('tasks.createTask'),
      size: 'xl',
      data: {
        fields: [
          {
            name: 'title',
            label: t('tasks.taskTitle'),
            type: 'text',
            required: true,
            placeholder: t('tasks.enterTaskTitle')
          },
          {
            name: 'description',
            label: t('tasks.description'),
            type: 'richtext',
            mentions: true,
            placeholder: t('tasks.enterTaskDescription')
          },
          {
            name: 'status',
            label: t('tasks.status'),
            type: 'select',
            defaultValue: 'backlog',
            options: statuses.map(s => ({ value: s.id, label: s.label }))
          },
          {
            name: 'priority',
            label: t('tasks.priority'),
            type: 'select',
            defaultValue: 'medium',
            options: [
              { value: 'low', label: t('tasks.priorities.low') },
              { value: 'medium', label: t('tasks.priorities.medium') },
              { value: 'high', label: t('tasks.priorities.high') },
              { value: 'urgent', label: t('tasks.priorities.urgent') }
            ]
          },
          {
            name: 'assigned_to',
            label: t('tasks.assignTo'),
            type: 'select',
            options: [
              { value: '', label: t('tasks.unassigned') },
              ...users.map(u => ({ value: u.id.toString(), label: u.full_name || u.username }))
            ]
          },
          {
            name: 'due_date',
            label: t('tasks.dueDate'),
            type: 'date'
          }
        ],
        onSubmit: async (data) => {
          try {
            const response = await apiClient.createTask({
              ...data,
              project_id: projectId
            })
            if (response.success) {
              showSuccessToast(t('tasks.taskCreatedSuccess'))
              loadProjectData()
            }
          } catch (error) {
            showErrorToast(error.message || t('tasks.taskCreateFailed'))
            throw error
          }
        }
      },
      confirmText: t('common.create'),
      cancelText: t('common.cancel')
    })
  }

  const handleEditTask = (task) => {
    openModal({
      layout: 'form',
      title: t('tasks.editTask'),
      size: 'xl',
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
            type: 'richtext',
            mentions: true,
            defaultValue: task.description || ''
          },
          {
            name: 'status',
            label: t('tasks.status'),
            type: 'select',
            defaultValue: task.status,
            options: statuses.map(s => ({ value: s.id, label: s.label }))
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
            name: 'assigned_to',
            label: t('tasks.assignTo'),
            type: 'select',
            defaultValue: task.assigned_to?.toString() || '',
            options: [
              { value: '', label: t('tasks.unassigned') },
              ...users.map(u => ({ value: u.id.toString(), label: u.full_name || u.username }))
            ]
          },
          {
            name: 'due_date',
            label: t('tasks.dueDate'),
            type: 'date',
            defaultValue: task.due_date || ''
          }
        ],
        onSubmit: async (data) => {
          try {
            const response = await apiClient.updateTask(task.id, data)
            if (response.success) {
              showSuccessToast(t('tasks.taskUpdatedSuccess'))
              loadProjectData()
            }
          } catch (error) {
            showErrorToast(error.message || t('tasks.taskUpdateFailed'))
            throw error
          }
        }
      },
      confirmText: t('common.save'),
      cancelText: t('common.cancel')
    })
  }

  const handleDeleteTask = (task) => {
    openConfirmModal({
      title: t('tasks.deleteTask'),
      message: t('tasks.deleteTaskConfirm', { title: task.title }),
      variant: 'danger',
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try {
          const response = await apiClient.deleteTask(task.id)
          if (response.success) {
            showSuccessToast(t('tasks.taskDeletedSuccess'))
            loadProjectData()
          }
        } catch (error) {
          showErrorToast(error.message || t('tasks.taskDeleteFailed'))
        }
      }
    })
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await apiClient.updateTaskStatus(taskId, newStatus)
      if (response.success) {
        showSuccessToast(t('tasks.taskStatusUpdatedSuccess'))
        loadProjectData()
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
        onTaskUpdate: loadProjectData,
        onEditTask: handleEditTask,
        onDeleteTask: handleDeleteTask
      }
    })
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
    const isOverdue = date < today && dateString

    return {
      formatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isOverdue
    }
  }

  const getAssignedUser = (userId) => {
    return users.find(u => u.id === userId)
  }

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status)
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
      id: 'status',
      key: 'status',
      label: t('tasks.status'),
      type: 'custom',
      render: (row) => {
        const status = statuses.find(s => s.id === row.status)
        const colorClasses = {
          gray: 'bg-gray-100 text-gray-800',
          yellow: 'bg-yellow-100 text-yellow-800',
          blue: 'bg-blue-100 text-blue-800',
          purple: 'bg-purple-100 text-purple-800',
          green: 'bg-green-100 text-green-800'
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[status?.color] || 'bg-gray-100 text-gray-800'}`}>
            {status?.label || row.status}
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
        <span className={`px-2 py-1 rounded text-xs font-medium capitalize border ${getPriorityColor(row.priority)}`}>
          {t(`tasks.priorities.${row.priority}`)}
        </span>
      )
    },
    {
      id: 'assigned_to',
      key: 'assigned_to',
      label: t('tasks.assignTo'),
      type: 'custom',
      render: (row) => {
        const assignedUser = getAssignedUser(row.assigned_to)
        if (!assignedUser) {
          return <span className="text-gray-400 text-sm">{t('tasks.unassigned')}</span>
        }
        return (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {(assignedUser.full_name || assignedUser.username).substring(0, 1).toUpperCase()}
              </span>
            </div>
            <span className="text-sm">{assignedUser.full_name || assignedUser.username}</span>
          </div>
        )
      }
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
    },
    {
      id: 'actions',
      key: 'actions',
      label: t('common.actions'),
      type: 'custom',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEditTask(row)
            }}
            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
            title={t('tasks.editTaskTitle')}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteTask(row)
            }}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title={t('tasks.deleteTaskTitle')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const tableConfig = {
    columns: tableColumns,
    data: tasks,
    onRowClick: (task) => handleViewTask(task),
    tableType: 'tasks'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader text={t('tasks.loadingProject')} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('tasks.projectNotFound')}</h2>
          <button
            onClick={() => navigate('/projects')}
            className="text-indigo-600 hover:text-indigo-700"
          >
            {t('tasks.backToProjects')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span>{t('tasks.backToProjects')}</span>
          </button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 max-w-3xl">{project.description}</p>
            )}
            <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>{tasks.length} {t('projects.tasks').toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="px-8 py-4 ">
        <div className="flex items-center justify-end space-x-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">{t('common.table')}</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Kanban View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">{t('common.kanban')}</span>
            </button>
          </div>

          {/* New Task Button */}
          <button
            onClick={handleCreateTask}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>{t('tasks.newTask')}</span>
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="flex-1 overflow-auto p-8">
          <Table
            tableConfig={tableConfig}
            stickyHeader={true}
          />
        </div>
      )}

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex space-x-4 p-8 h-full">
          {statuses.map((status) => {
            const statusTasks = getTasksByStatus(status.id)
            const colorClasses = {
              gray: 'bg-gray-100 border-gray-300',
              yellow: 'bg-yellow-100 border-yellow-300',
              blue: 'bg-blue-100 border-blue-300',
              purple: 'bg-purple-100 border-purple-300',
              green: 'bg-green-100 border-green-300'
            }

            return (
              <div key={status.id} className="flex-shrink-0 w-80 flex flex-col">
                {/* Column Header */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 ${colorClasses[status.color]} mb-4`}>
                  <h3 className="font-semibold text-gray-900">{status.label}</h3>
                  <span className="bg-white px-2 py-1 rounded text-sm font-medium text-gray-700">
                    {statusTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto space-y-3">
                  {statusTasks.map((task) => {
                    const dueDate = formatDate(task.due_date)
                    const assignedUser = getAssignedUser(task.assigned_to)

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleViewTask(task)}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer group"
                      >
                        {/* Task Header */}
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium text-gray-900 flex-1 pr-2 line-clamp-2">
                            {task.title}
                          </h4>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTask(task)
                              }}
                              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              title={t('tasks.editTaskTitle')}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteTask(task)
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title={t('tasks.deleteTaskTitle')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Task Description */}
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Task Meta */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {/* Priority Badge */}
                            <span className={`px-2 py-1 rounded text-xs font-medium capitalize border ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>

                            {/* Due Date */}
                            {dueDate && (
                              <div className={`flex items-center space-x-1 text-xs ${
                                dueDate.isOverdue ? 'text-red-600' : 'text-gray-500'
                              }`}>
                                <Calendar className="w-3 h-3" />
                                <span>{dueDate.formatted}</span>
                              </div>
                            )}
                          </div>

                          {/* Assigned User */}
                          {assignedUser && (
                            <div className="flex items-center space-x-1">
                              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">
                                  {(assignedUser.full_name || assignedUser.username).substring(0, 1).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status Quick Actions */}
                        {status.id !== 'done' && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {statuses.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {statusTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      {t('tasks.noTasks')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}

      </div>
  )
}

export default ProjectDetails
