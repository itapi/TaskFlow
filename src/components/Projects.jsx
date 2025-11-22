import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FolderKanban, Plus, Edit2, Trash2, Users, CheckSquare } from 'lucide-react'
import apiClient from '../utils/api'
import { showSuccessToast, showErrorToast } from '../utils/toastHelpers'
import { useModal } from '../contexts/GlobalStateContext'
import Loader from './Loader'

function Projects() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { openModal } = useModal()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getProjects()
      if (response.success) {
        setProjects(response.data || [])
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
      showErrorToast(t('projects.loadProjectsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = () => {
    openModal({
      title: t('projects.createNewProject'),
      fields: [
        {
          name: 'name',
          label: t('projects.projectName'),
          type: 'text',
          required: true,
          placeholder: t('projects.enterProjectName')
        },
        {
          name: 'description',
          label: t('projects.description'),
          type: 'textarea',
          placeholder: t('projects.enterProjectDescription')
        }
      ],
      onSubmit: async (data) => {
        try {
          const response = await apiClient.createProject(data)
          if (response.success) {
            showSuccessToast(t('projects.projectCreatedSuccess'))
            loadProjects()
          }
        } catch (error) {
          showErrorToast(error.message || t('projects.projectCreateFailed'))
          throw error
        }
      }
    })
  }

  const handleEditProject = (project) => {
    openModal({
      title: t('projects.editProject'),
      fields: [
        {
          name: 'name',
          label: t('projects.projectName'),
          type: 'text',
          required: true,
          defaultValue: project.name
        },
        {
          name: 'description',
          label: t('projects.description'),
          type: 'textarea',
          defaultValue: project.description || ''
        },
        {
          name: 'status',
          label: t('projects.status'),
          type: 'select',
          defaultValue: project.status || 'active',
          options: [
            { value: 'active', label: t('projects.statuses.active') },
            { value: 'completed', label: t('projects.statuses.completed') },
            { value: 'on_hold', label: t('projects.statuses.on_hold') },
            { value: 'cancelled', label: t('projects.statuses.cancelled') }
          ]
        }
      ],
      onSubmit: async (data) => {
        try {
          const response = await apiClient.updateProject(project.id, data)
          if (response.success) {
            showSuccessToast(t('projects.projectUpdatedSuccess'))
            loadProjects()
          }
        } catch (error) {
          showErrorToast(error.message || t('projects.projectUpdateFailed'))
          throw error
        }
      }
    })
  }

  const handleDeleteProject = (project) => {
    openModal({
      title: t('projects.deleteProject'),
      message: t('projects.deleteConfirm', { name: project.name }),
      type: 'confirm',
      confirmText: t('common.delete'),
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          const response = await apiClient.deleteProject(project.id)
          if (response.success) {
            showSuccessToast(t('projects.projectDeletedSuccess'))
            loadProjects()
          }
        } catch (error) {
          showErrorToast(error.message || t('projects.projectDeleteFailed'))
          throw error
        }
      }
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-700 border-green-200',
      'completed': 'bg-blue-100 text-blue-700 border-blue-200',
      'on_hold': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'cancelled': 'bg-red-100 text-red-700 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'active': t('projects.statuses.active'),
      'completed': t('projects.statuses.completed'),
      'on_hold': t('projects.statuses.on_hold'),
      'cancelled': t('projects.statuses.cancelled')
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader text={t('projects.loadingProjects')} />
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
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('projects.title')}</h1>
              <p className="text-gray-600">{t('projects.manageProjects')}</p>
            </div>
          </div>
          <button
            onClick={handleCreateProject}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>{t('projects.newProject')}</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('projects.noProjects')}</h3>
          <p className="text-gray-600 mb-6">{t('projects.createFirst')}</p>
          <button
            onClick={handleCreateProject}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{t('projects.createProject')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              {/* Project Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-lg font-semibold text-gray-900 mb-2 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      {project.name}
                    </h3>
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditProject(project)
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title={t('projects.editProjectTitle')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProject(project)
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('projects.deleteProjectTitle')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>

              {/* Project Stats */}
              <div className="p-6 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">{t('projects.tasks')}</p>
                      <p className="text-sm font-semibold text-gray-900">{project.task_count || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">{t('projects.members')}</p>
                      <p className="text-sm font-semibold text-gray-900">{project.member_count || 0}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="w-full mt-4 py-2 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm font-medium"
                >
                  {t('projects.viewDetails')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Projects
