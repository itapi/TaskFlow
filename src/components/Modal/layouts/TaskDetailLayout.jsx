import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import apiClient from '../../../utils/api'
import { useGlobalState } from '../../../contexts/GlobalStateContext'
import {
  Send,
  Calendar,
  User,
  Flag,
  MessageSquare,
  Edit2,
  Trash2
} from 'lucide-react'

export const TaskDetailLayout = forwardRef(({ data }, ref) => {
  const { t } = useTranslation()
  const { state, closeModal } = useGlobalState()
  const currentUser = state.user

  const { task, users = [], statuses = [], onTaskUpdate, onEditTask, onDeleteTask } = data

  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const messagesEndRef = useRef(null)

  useImperativeHandle(ref, () => ({
    submitForm: () => {
      // No form submission needed for this layout
    }
  }))

  useEffect(() => {
    if (task) {
      loadComments()
    }
  }, [task])

  useEffect(() => {
    scrollToBottom()
  }, [comments])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadComments = async () => {
    if (!task) return

    try {
      setLoadingComments(true)
      const response = await apiClient.getComments(task.id)
      if (response.success) {
        setComments(response.data || [])
      }
    } catch (err) {
      console.error('Error loading comments:', err)
      toast.error(t('messages.error'))
    } finally {
      setLoadingComments(false)
    }
  }

  const handleSendComment = async () => {
    if (!newComment.trim() || !task || sendingComment) return

    try {
      setSendingComment(true)
      const response = await apiClient.addComment(task.id, newComment.trim())

      if (response.success) {
        setComments(prev => [...prev, response.data])
        setNewComment('')
        if (onTaskUpdate) {
          onTaskUpdate(task.id, 'comment_added')
        }
      } else {
        throw new Error(response.error || 'Failed to add comment')
      }
    } catch (err) {
      toast.error(err.message || t('messages.error'))
      console.error('Error sending comment:', err)
    } finally {
      setSendingComment(false)
    }
  }

  const handleEditComment = async (commentId) => {
    if (!editingCommentText.trim()) return

    try {
      const response = await apiClient.updateComment(commentId, editingCommentText.trim())
      if (response.success) {
        setComments(prev => prev.map(c =>
          c.id === commentId
            ? { ...c, comment: editingCommentText.trim(), is_edited: true }
            : c
        ))
        setEditingCommentId(null)
        setEditingCommentText('')
        toast.success(t('messages.updateSuccess'))
      }
    } catch (err) {
      toast.error(err.message || t('messages.error'))
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm(t('messages.confirmDelete'))) return

    try {
      const response = await apiClient.deleteComment(commentId)
      if (response.success) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        toast.success(t('messages.deleteSuccess'))
      }
    } catch (err) {
      toast.error(err.message || t('messages.error'))
    }
  }

  const startEditingComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.comment)
  }

  const cancelEditingComment = () => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const formatDate = (dateString) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  const getStatusColor = (statusId) => {
    const status = statuses.find(s => s.id === statusId)
    const colorClasses = {
      gray: 'bg-gray-100 text-gray-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800'
    }
    return colorClasses[status?.color] || 'bg-gray-100 text-gray-800'
  }

  const getAssignedUser = (userId) => {
    return users.find(u => u.id === userId)
  }

  if (!task) return null

  const assignedUser = getAssignedUser(task.assigned_to)
  const status = statuses.find(s => s.id === task.status)

  const CommentItem = ({ comment }) => {
    const isOwner = currentUser?.id === comment.user_id
    const isEditing = editingCommentId === comment.id

    return (
      <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.user_avatar ? (
            <img
              src={comment.user_avatar}
              alt={comment.user_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {(comment.user_name || 'U').substring(0, 1).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 text-sm">
                {comment.user_name}
              </span>
              <span className="text-xs text-gray-500">
                {formatDateTime(comment.created_at)}
              </span>
              {(comment.is_edited === true || comment.is_edited === 1 || comment.is_edited === '1') && (
                <span className="text-xs text-gray-400 italic">
                  ({t('comments.edited')})
                </span>
              )}
            </div>

            {/* Actions */}
            {isOwner && !isEditing && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEditingComment(comment)}
                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                  title={t('common.edit')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Comment Text or Edit Input */}
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editingCommentText}
                onChange={(e) => setEditingCommentText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={cancelEditingComment}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
              {comment.comment}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '70vh' }}>
      {/* Task Details Header - Compact */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100 bg-white">
        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mb-3">
          {onEditTask && (
            <button
              onClick={() => {
                closeModal()
                onEditTask(task)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {t('common.edit')}
            </button>
          )}
          {onDeleteTask && (
            <button
              onClick={() => {
                closeModal()
                onDeleteTask(task)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          )}
        </div>

        {/* Task Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Status */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.status')}
            </label>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {status?.label || task.status}
              </span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.priority')}
            </label>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                <Flag className="w-3 h-3" />
                {t(`tasks.priorities.${task.priority}`)}
              </span>
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.assignedTo')}
            </label>
            <div className="mt-1 flex items-center gap-2">
              {assignedUser ? (
                <>
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {(assignedUser.full_name || assignedUser.username).substring(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-900">
                    {assignedUser.full_name || assignedUser.username}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400">{t('tasks.unassigned')}</span>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.dueDate')}
            </label>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              {task.due_date ? (
                <>
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className={new Date(task.due_date) < new Date() ? 'text-red-600 font-medium' : 'text-gray-900'}>
                    {formatDate(task.due_date)}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <label className="text-xs text-gray-500 uppercase tracking-wider">
              {t('tasks.description')}
            </label>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
              {task.description}
            </p>
          </div>
        )}
      </div>

      {/* Comments Section - Takes remaining space */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Comments Header */}
        <div className="flex-shrink-0 px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-gray-900">
              {t('comments.title')}
            </h3>
            <span className="text-sm text-gray-500">
              ({comments.length})
            </span>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px]">
          {loadingComments ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600">{t('common.loading')}</span>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>{t('comments.noComments')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Add Comment Input */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100 bg-white">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendComment()
                }
              }}
              placeholder={t('comments.writeComment')}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={sendingComment}
            />
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim() || sendingComment}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !newComment.trim() || sendingComment
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {sendingComment ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

TaskDetailLayout.displayName = 'TaskDetailLayout'

export default TaskDetailLayout
